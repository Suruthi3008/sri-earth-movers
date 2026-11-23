"""End-to-end checks of the core business rules."""
from datetime import date

from tests.conftest import TEST_PASSWORD


def login(client) -> dict[str, str]:
    response = client.post("/api/auth/login", json={"username": "admin", "password": TEST_PASSWORD})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_requests_work_without_login(client):
    assert client.get("/api/bills").status_code == 200


def test_billing_payment_expense_and_report_flow(client):
    headers = login(client)
    today = date.today().isoformat()

    # JCB 5.5 × 900 + 500 = 5,450 and Lorry 2 × 1,500 (M Sand) = 3,000 → total 8,450
    bill = client.post("/api/bills", headers=headers, json={
        "bill_date": today,
        "customer_name": "Kumar",
        "customer_address": "",
        "project_name": "",
        "items": [
            {"date": today, "work_type": "JCB Work", "description": "", "quantity": 5.5,
             "unit": "hrs", "rate": 900, "bata": 500},
            {"date": today, "work_type": "Lorry Service", "material": "M Sand", "quantity": 2,
             "unit": "Load", "rate": 1500, "bata": 0},
        ],
    }).json()
    assert bill["total_amount"] == 8450
    assert bill["status"] == "Pending"
    bill_id = bill["bill_id"]
    assert bill["items"][1]["description"] == "M Sand"

    def pay(amount):
        return client.post("/api/payments", headers=headers, json={
            "bill_id": bill_id, "payment_date": today, "amount": amount, "payment_method": "UPI / GPay",
        })

    assert pay(4000).status_code == 201
    assert client.get(f"/api/bills/{bill_id}", headers=headers).json()["status"] == "Partly Paid"
    assert pay(5000).status_code == 400  # overpayment blocked
    assert pay(4450).status_code == 201
    paid = client.get(f"/api/bills/{bill_id}", headers=headers).json()
    assert paid["status"] == "Paid" and paid["pending_amount"] == 0

    expense = client.post("/api/expenses", headers=headers, json={
        "date": today, "category": "Diesel", "machine": "General", "description": "",
        "amount": 2000, "payment_method": "Cash", "notes": "",
    })
    assert expense.status_code == 201

    report = client.get("/api/reports?preset=month", headers=headers).json()
    assert report["income"]["total"] == 8450
    assert report["expenses"]["diesel"] == 2000
    assert report["result"]["profit"] == 6450

    dashboard = client.get("/api/dashboard", headers=headers).json()
    assert dashboard["income"] == 8450 and dashboard["profit"] == 6450 and dashboard["pending"] == 0


def test_lorry_requires_material_and_valid_unit(client):
    headers = login(client)
    today = date.today().isoformat()
    base = {"bill_date": today, "customer_name": "Test", "items": []}

    no_material = dict(base, items=[{"date": today, "work_type": "Lorry Service", "quantity": 1,
                                     "unit": "Ton", "rate": 500, "bata": 0}])
    assert client.post("/api/bills", headers=headers, json=no_material).status_code == 422

    bad_unit = dict(base, items=[{"date": today, "work_type": "Lorry Service", "material": "Black Stone",
                                  "quantity": 1, "unit": "trips", "rate": 500, "bata": 0}])
    assert client.post("/api/bills", headers=headers, json=bad_unit).status_code == 422


def test_tractor_income_and_machine_expenses(client):
    headers = login(client)
    today = date.today().isoformat()
    before = client.get("/api/reports?preset=month", headers=headers).json()

    bill = client.post("/api/bills", headers=headers, json={
        "bill_date": today, "customer_name": "Farm Co", "items": [
            {"date": today, "work_type": "Tractor Service", "quantity": 4, "unit": "Hours",
             "rate": 800, "bata": 0},
        ],
    })
    assert bill.status_code == 201, bill.text
    assert bill.json()["total_amount"] == 3200

    client.post("/api/expenses", headers=headers, json={
        "date": today, "category": "Diesel", "machine": "JCB2012", "description": "",
        "amount": 1000, "payment_method": "Cash", "notes": "",
    })
    client.post("/api/expenses", headers=headers, json={
        "date": today, "category": "Vehicle Maintenance", "machine": "JCB2022", "description": "",
        "amount": 700, "payment_method": "Cash", "notes": "",
    })

    after = client.get("/api/reports?preset=month", headers=headers).json()
    assert after["income"]["tractor_service"] - before["income"]["tractor_service"] == 3200
    machines = {m["name"]: m for m in after["machines"]}
    prev = {m["name"]: m for m in before["machines"]}
    assert machines["JCB2012"]["diesel"] - prev["JCB2012"]["diesel"] == 1000
    assert machines["JCB2022"]["maintenance"] - prev["JCB2022"]["maintenance"] == 700


def test_custom_report_rejects_reversed_dates(client):
    headers = login(client)
    response = client.get("/api/reports?preset=custom&start=2026-11-10&end=2026-11-01", headers=headers)
    assert response.status_code == 400


def test_excel_export_downloads_valid_workbook(client):
    import io
    from openpyxl import load_workbook

    response = client.get("/api/exports/excel")
    assert response.status_code == 200
    assert "spreadsheetml" in response.headers["content-type"]
    assert "attachment" in response.headers["content-disposition"]
    wb = load_workbook(io.BytesIO(response.content))
    assert "Bills" in wb.sheetnames and "Expenses" in wb.sheetnames


def test_minimum_charge_day_rate_bata_and_advance(client):
    headers = login(client)
    today = date.today().isoformat()

    def make_bill(items, advance=0):
        return client.post("/api/bills", headers=headers, json={
            "bill_date": today, "customer_name": "Minimum Test", "advance": advance, "items": items,
        })

    # 3 hours or less: minimum charge 4,500, default bata 500 → 5,000
    small = make_bill([{"date": today, "work_type": "JCB Work", "quantity": 3, "unit": "hrs",
                        "rate": 900, "bata": 500}])
    assert small.status_code == 201, small.text
    assert small.json()["total_amount"] == 5000
    assert small.json()["items"][0]["base"] == 4500

    # Above 3 hours: quantity × rate → 5.5 × 900 = 4,950
    above = make_bill([{"date": today, "work_type": "JCB Work", "quantity": 5.5, "unit": "hrs",
                        "rate": 900, "bata": 0}])
    assert above.json()["total_amount"] == 4950

    # One day at 8,000, bata cleared → 8,000
    day = make_bill([{"date": today, "work_type": "JCB Work", "quantity": 1, "unit": "day",
                      "rate": 8000, "bata": 0}])
    assert day.json()["total_amount"] == 8000
    assert day.json()["items"][0]["base"] == 8000

    # Advance 2,000 → pending 6,000, status Partly Paid
    with_advance = make_bill([{"date": today, "work_type": "JCB Work", "quantity": 1, "unit": "day",
                               "rate": 8000, "bata": 0}], advance=2000)
    body = with_advance.json()
    assert body["advance"] == 2000
    assert body["pending_amount"] == 6000
    assert body["status"] == "Partly Paid"
    bill_id = body["bill_id"]

    # Advance cannot be more than the total
    too_much = make_bill([{"date": today, "work_type": "JCB Work", "quantity": 1, "unit": "day",
                           "rate": 8000, "bata": 0}], advance=9000)
    assert too_much.status_code == 400

    # Editing the advance to 0 makes the full amount pending again
    items = [{"date": today, "work_type": "JCB Work", "quantity": 1, "unit": "day", "rate": 8000, "bata": 0}]
    edited = client.put(f"/api/bills/{bill_id}", headers=headers, json={
        "bill_date": today, "customer_name": "Minimum Test", "advance": 0, "items": items,
    })
    assert edited.status_code == 200, edited.text
    assert edited.json()["advance"] == 0
    assert edited.json()["pending_amount"] == 8000

    # PDF still generates with an advance and with an empty bata
    pdf = client.get(f"/api/bills/{bill_id}/pdf", headers=headers)
    assert pdf.status_code == 200 and pdf.content[:4] == b"%PDF"


def test_old_balance_and_total_balance(client):
    headers = login(client)
    today = date.today().isoformat()
    # Same numbers as the sample bill: 4,500 minimum + 7 days at 8,000 + 500 bata = 64,000
    items = [{"date": today, "work_type": "JCB Work", "quantity": 2, "unit": "hrs", "rate": 900, "bata": 0}]
    items += [{"date": today, "work_type": "JCB Work", "quantity": 1, "unit": "day", "rate": 8000, "bata": 500}
              for _ in range(7)]

    created = client.post("/api/bills", headers=headers, json={
        "bill_date": today, "customer_name": "Balance Test", "advance": 27000, "old_balance": 2500,
        "items": items,
    })
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["total_amount"] == 64000
    assert body["advance"] == 27000
    assert body["old_balance"] == 2500
    assert body["total_balance"] == 39500           # 64,000 + 2,500 - 27,000
    assert body["pending_amount"] == 37000          # old balance is not added to this bill's pending
    bill_id = body["bill_id"]

    # No old balance: Total Balance = work total - advance
    plain = client.post("/api/bills", headers=headers, json={
        "bill_date": today, "customer_name": "Plain", "advance": 1000, "items": items,
    }).json()
    assert plain["old_balance"] == 0
    assert plain["total_balance"] == 63000

    # Editing the old balance recalculates Total Balance
    edited = client.put(f"/api/bills/{bill_id}", headers=headers, json={
        "bill_date": today, "customer_name": "Balance Test", "advance": 27000, "old_balance": 0,
        "items": items,
    }).json()
    assert edited["old_balance"] == 0
    assert edited["total_balance"] == 37000

    pdf = client.get(f"/api/bills/{bill_id}/pdf", headers=headers)
    assert pdf.status_code == 200 and pdf.content[:4] == b"%PDF"

