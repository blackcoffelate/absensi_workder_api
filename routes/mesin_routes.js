var express = require('express')
var router = express.Router()
var mesinController = require('../controller/mac_address_controller')

router.post('/tambahMacAddress', mesinController.create)
router.post('/deleteMacAddress', mesinController.delete)

router.post('/tambahdevMacAddress', mesinController.createDev)

module.exports = router