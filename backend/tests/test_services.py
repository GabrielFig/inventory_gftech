async def _create_service(client, headers, name="Cambio de pantalla", price=800):
    response = await client.post(
        "/api/v1/services", json={"name": name, "description": "Incluye mano de obra", "price": price}, headers=headers
    )
    assert response.status_code == 201, response.text
    return response.json()


async def test_admin_can_create_and_list_services(client, admin_headers):
    created = await _create_service(client, admin_headers)
    assert created["name"] == "Cambio de pantalla"
    assert created["is_active"] is True

    listing = await client.get("/api/v1/services", headers=admin_headers)
    assert [s["name"] for s in listing.json()] == ["Cambio de pantalla"]


async def test_vendedor_cannot_create_service(client, vendedor_headers):
    response = await client.post("/api/v1/services", json={"name": "X", "price": 10}, headers=vendedor_headers)
    assert response.status_code == 403


async def test_duplicate_service_name_conflicts(client, admin_headers):
    await _create_service(client, admin_headers)
    response = await client.post(
        "/api/v1/services", json={"name": "Cambio de pantalla", "price": 5}, headers=admin_headers
    )
    assert response.status_code == 409


async def test_update_price_and_deactivate(client, admin_headers):
    created = await _create_service(client, admin_headers)
    response = await client.patch(
        f"/api/v1/services/{created['id']}", json={"price": 950, "is_active": False}, headers=admin_headers
    )
    assert response.status_code == 200
    assert float(response.json()["price"]) == 950
    active = await client.get("/api/v1/services?active_only=true", headers=admin_headers)
    assert active.json() == []


async def test_register_record_uses_catalog_price_by_default(client, admin_headers, vendedor_headers):
    service = await _create_service(client, admin_headers)
    response = await client.post("/api/v1/service-records", json={"service_id": service["id"]}, headers=vendedor_headers)
    assert response.status_code == 201
    assert float(response.json()["price"]) == 800
    assert response.json()["service_name"] == "Cambio de pantalla"


async def test_register_record_with_custom_price_and_history_survives_delete(client, admin_headers):
    service = await _create_service(client, admin_headers)
    record = await client.post(
        "/api/v1/service-records",
        json={"service_id": service["id"], "price": 700, "notes": "Cliente frecuente"},
        headers=admin_headers,
    )
    assert float(record.json()["price"]) == 700

    delete = await client.delete(f"/api/v1/services/{service['id']}", headers=admin_headers)
    assert delete.status_code == 204

    history = await client.get("/api/v1/service-records", headers=admin_headers)
    assert history.json()["total"] == 1
    assert history.json()["items"][0]["service_name"] == "Cambio de pantalla"


async def test_cannot_register_inactive_service(client, admin_headers):
    service = await _create_service(client, admin_headers)
    await client.patch(f"/api/v1/services/{service['id']}", json={"is_active": False}, headers=admin_headers)
    response = await client.post("/api/v1/service-records", json={"service_id": service["id"]}, headers=admin_headers)
    assert response.status_code == 400


async def test_only_admin_deletes_records(client, admin_headers, vendedor_headers):
    service = await _create_service(client, admin_headers)
    record = (
        await client.post("/api/v1/service-records", json={"service_id": service["id"]}, headers=vendedor_headers)
    ).json()
    forbidden = await client.delete(f"/api/v1/service-records/{record['id']}", headers=vendedor_headers)
    assert forbidden.status_code == 403
    ok = await client.delete(f"/api/v1/service-records/{record['id']}", headers=admin_headers)
    assert ok.status_code == 204


async def test_income_combines_sales_and_services(client, admin_headers, test_product):
    service = await _create_service(client, admin_headers, price=300)
    await client.post("/api/v1/service-records", json={"service_id": service["id"]}, headers=admin_headers)
    await client.post(
        "/api/v1/sales", json={"product_id": str(test_product.id), "quantity": 2}, headers=admin_headers
    )

    response = await client.get("/api/v1/dashboard/income", headers=admin_headers)
    assert response.status_code == 200
    summary = response.json()["summary"]
    assert float(summary["sales_revenue"]) == 40  # 2 x 20
    assert float(summary["sales_profit"]) == 20  # 2 x (20 - 10)
    assert float(summary["services_revenue"]) == 300
    assert float(summary["total_revenue"]) == 340
    assert float(summary["total_profit"]) == 320
    assert len(response.json()["daily"]) == 1
