const express = require('express');
const router = express.Router();
const artController = require('../controllers/artController');

router.post('/process', artController.processImage);

router.get('/:uuid', artController.getArtwork);

router.post('/:uuid/publish', artController.publishArtwork);

module.exports = router;
