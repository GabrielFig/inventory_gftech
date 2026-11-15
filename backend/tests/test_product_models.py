import pytest
from sqlalchemy import func, select

from app.models.phone_model import PhoneModel, ProductCompatibility

PRODUCTS = "/api/v1/products"
MODELS = "/api/v1/phone-models"
SEARCH = "/api/v1/compatibility/search"


@pytest.fixture
async def phone_models(db_session) -> dict[str, PhoneModel]:
    items = {
        "a15": PhoneModel(brand="Samsung", model="A15"),
        "a35": PhoneModel(brand="Samsung", model="A35"),
        "i15": PhoneModel(brand="Apple", model="iPhone 15"),
    }
    db_session.add_all(items.values())
    await db_session.commit()
    return items


def _payload(test_product, **extra) -> dict:
    return {
        "supplier_id": str(test_product.supplier_id),
        "category_id": str(test_product.category_id),
        "name": "Funda nueva",
        "model_compatibility": "Samsung A15 / A35",
        "cost": 20,
        "sale_price": 70,
        "initial_stock": 3,
        **extra,
    }


async def test_create_product_links_models_and_search_finds_it(client, admin_headers, test_product, phone_models):
    body = _payload(test_product, compatible_models=[{"id": str(phone_models["a15"].id)}, {"id": str(phone_models["a35"].id)}])
    res = await client.post(PRODUCTS, json=body, headers=admin_headers)
    assert res.status_code == 201, res.text
    created = res.json()
    assert [(m["brand"], m["model"]) for m in created["compatible_models"]] == [("Samsung", "A15"), ("Samsung", "A35")]

    found = await client.get(SEARCH, params={"q": "A35"}, headers=admin_headers)
    assert found.status_code == 200
    matches = [p["code"] for r in found.json() for p in r["matches"]]
    assert created["code"] in matches


async def test_create_product_without_models_has_empty_list(client, admin_headers, test_product):
    res = await client.post(PRODUCTS, json=_payload(test_product), headers=admin_headers)
    assert res.status_code == 201
    assert res.json()["compatible_models"] == []


async def test_create_with_new_model_creates_phone_model(client, admin_headers, test_product, db_session):
    body = _payload(test_product, compatible_models=[{"brand": "  Motorola ", "model": "Moto  G05"}])
    res = await client.post(PRODUCTS, json=body, headers=admin_headers)
    assert res.status_code == 201, res.text
    assert [(m["brand"], m["model"]) for m in res.json()["compatible_models"]] == [("Motorola", "Moto G05")]
    assert (await db_session.execute(select(func.count()).select_from(PhoneModel))).scalar_one() == 1


async def test_new_model_reuses_existing_ignoring_case(client, admin_headers, test_product, phone_models, db_session):
    body = _payload(test_product, compatible_models=[{"brand": "samsung", "model": "a15"}])
    res = await client.post(PRODUCTS, json=body, headers=admin_headers)
    assert res.status_code == 201, res.text
    assert res.json()["compatible_models"][0]["id"] == str(phone_models["a15"].id)
    assert (await db_session.execute(select(func.count()).select_from(PhoneModel))).scalar_one() == 3


async def test_duplicate_models_in_payload_are_collapsed(client, admin_headers, test_product, phone_models):
    a15 = str(phone_models["a15"].id)
    body = _payload(test_product, compatible_models=[{"id": a15}, {"id": a15}, {"brand": "Samsung", "model": "A15"}])
    res = await client.post(PRODUCTS, json=body, headers=admin_headers)
    assert res.status_code == 201, res.text
    assert len(res.json()["compatible_models"]) == 1


async def test_unknown_model_id_is_422(client, admin_headers, test_product):
    body = _payload(test_product, compatible_models=[{"id": "00000000-0000-0000-0000-000000000001"}])
    res = await client.post(PRODUCTS, json=body, headers=admin_headers)
    assert res.status_code == 422


async def test_model_needs_id_or_brand_and_model(client, admin_headers, test_product):
    res = await client.post(PRODUCTS, json=_payload(test_product, compatible_models=[{"brand": "Samsung"}]), headers=admin_headers)
    assert res.status_code == 422


async def test_update_replaces_models(client, admin_headers, test_product, phone_models):
    first = await client.patch(
        f"{PRODUCTS}/{test_product.id}",
        json={"compatible_models": [{"id": str(phone_models["a15"].id)}, {"id": str(phone_models["i15"].id)}]},
        headers=admin_headers,
    )
    assert first.status_code == 200, first.text
    assert len(first.json()["compatible_models"]) == 2

    second = await client.patch(
        f"{PRODUCTS}/{test_product.id}", json={"compatible_models": [{"id": str(phone_models["a35"].id)}]}, headers=admin_headers
    )
    assert [m["model"] for m in second.json()["compatible_models"]] == ["A35"]
    # el modelo desvinculado ya no encuentra el producto
    found = await client.get(SEARCH, params={"q": "A15"}, headers=admin_headers)
    assert [p for r in found.json() for p in r["matches"]] == []


async def test_update_keeps_note_of_models_that_stay(client, admin_headers, test_product, phone_models, db_session):
    db_session.add(ProductCompatibility(product_id=test_product.id, phone_model_id=phone_models["a15"].id, note="Funda"))
    await db_session.commit()

    res = await client.patch(
        f"{PRODUCTS}/{test_product.id}",
        json={"compatible_models": [{"id": str(phone_models["a15"].id)}, {"id": str(phone_models["a35"].id)}]},
        headers=admin_headers,
    )
    assert res.status_code == 200, res.text
    notes = {m["model"]: m["note"] for m in res.json()["compatible_models"]}
    assert notes == {"A15": "Funda", "A35": None}


async def test_update_without_field_leaves_models_untouched(client, admin_headers, test_product, phone_models, db_session):
    db_session.add(ProductCompatibility(product_id=test_product.id, phone_model_id=phone_models["a15"].id))
    await db_session.commit()

    res = await client.patch(f"{PRODUCTS}/{test_product.id}", json={"name": "Otro nombre"}, headers=admin_headers)
    assert res.status_code == 200
    assert [m["model"] for m in res.json()["compatible_models"]] == ["A15"]


async def test_update_with_empty_list_clears_models(client, admin_headers, test_product, phone_models, db_session):
    db_session.add(ProductCompatibility(product_id=test_product.id, phone_model_id=phone_models["a15"].id))
    await db_session.commit()

    res = await client.patch(f"{PRODUCTS}/{test_product.id}", json={"compatible_models": []}, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["compatible_models"] == []


async def test_product_list_and_detail_expose_models(client, admin_headers, test_product, phone_models, db_session):
    db_session.add(ProductCompatibility(product_id=test_product.id, phone_model_id=phone_models["i15"].id))
    await db_session.commit()

    listing = await client.get(PRODUCTS, headers=admin_headers)
    assert listing.json()["items"][0]["compatible_models"][0]["model"] == "iPhone 15"
    detail = await client.get(f"{PRODUCTS}/{test_product.id}", headers=admin_headers)
    assert detail.json()["compatible_models"][0]["brand"] == "Apple"


async def test_vendedor_cannot_set_models(client, vendedor_headers, test_product, phone_models):
    res = await client.patch(
        f"{PRODUCTS}/{test_product.id}",
        json={"compatible_models": [{"id": str(phone_models["a15"].id)}]},
        headers=vendedor_headers,
    )
    assert res.status_code == 403


async def test_list_phone_models_with_search(client, vendedor_headers, phone_models):
    res = await client.get(MODELS, headers=vendedor_headers)
    assert res.status_code == 200
    assert [(m["brand"], m["model"]) for m in res.json()] == [("Apple", "iPhone 15"), ("Samsung", "A15"), ("Samsung", "A35")]

    by_model = await client.get(MODELS, params={"q": "a3"}, headers=vendedor_headers)
    assert [m["model"] for m in by_model.json()] == ["A35"]
    by_brand = await client.get(MODELS, params={"q": "samsung"}, headers=vendedor_headers)
    assert len(by_brand.json()) == 2
    # busca por "marca modelo" completo
    combined = await client.get(MODELS, params={"q": "samsung a15"}, headers=vendedor_headers)
    assert [m["model"] for m in combined.json()] == ["A15"]


async def test_list_phone_models_limit_and_auth(client, vendedor_headers, phone_models):
    limited = await client.get(MODELS, params={"limit": 2}, headers=vendedor_headers)
    assert len(limited.json()) == 2
    assert (await client.get(MODELS)).status_code == 401


async def test_list_brands(client, vendedor_headers, phone_models):
    res = await client.get(f"{MODELS}/brands", headers=vendedor_headers)
    assert res.status_code == 200
    assert res.json() == ["Apple", "Samsung"]
