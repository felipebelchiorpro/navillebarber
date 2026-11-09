/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3202216097")

  // update collection data
  unmarshal({
    "updateRule": "@request.auth.papel = 'superadmin' || id = @request.auth.barbearia_id || id != ''"
  }, collection)

  // add field
  collection.fields.addAt(29, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text4175484430",
    "max": 0,
    "min": 0,
    "name": "endereco",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(30, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2094297134",
    "max": 0,
    "min": 0,
    "name": "foto_capa_url",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(31, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text156371623",
    "max": 0,
    "min": 0,
    "name": "logo_url",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3202216097")

  // update collection data
  unmarshal({
    "updateRule": "@request.auth.papel = 'superadmin' || id = @request.auth.barbearia_id"
  }, collection)

  // remove field
  collection.fields.removeById("text4175484430")

  // remove field
  collection.fields.removeById("text2094297134")

  // remove field
  collection.fields.removeById("text156371623")

  return app.save(collection)
})
