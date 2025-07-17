const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('index', { title: 'Home Page' });
});

router.get('/debate', function(req, res, next) {
  res.render('debate');
});

module.exports = router;
