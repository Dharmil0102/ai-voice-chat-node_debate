const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  // Redirect to your main debate page
  res.redirect('/ai-debate/live');
});

module.exports = router;
