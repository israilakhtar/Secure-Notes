const express = require('express');
const { createNote, getNotes, deleteNote } = require('../controllers/noteController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // every notes route requires a valid JWT

router.post('/', createNote);
router.get('/', getNotes);
router.delete('/:id', deleteNote);

module.exports = router;
