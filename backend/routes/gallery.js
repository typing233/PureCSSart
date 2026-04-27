const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/galleryController');

router.get('/', galleryController.getGallery);

router.get('/:uuid', galleryController.getGalleryItem);

router.post('/:uuid/like', galleryController.likeArtwork);

router.get('/:uuid/like-status', galleryController.checkLikeStatus);

module.exports = router;
