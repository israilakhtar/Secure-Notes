const Note = require('../models/Note');

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

const toPublicNote = (note) => ({
  id: note._id,
  title: note.title,
  content: note.content,
  createdAt: note.createdAt,
  updatedAt: note.updatedAt
});

// POST /api/notes
const createNote = async (req, res) => {
  try {
    const { title, content } = req.body || {};

    if (typeof title !== 'string' || typeof content !== 'string') {
      return res.status(400).json({ message: 'Title and content are required.' });
    }

    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    if (!cleanTitle || !cleanContent) {
      return res.status(400).json({ message: 'Title and content cannot be empty.' });
    }
    if (cleanTitle.length > 120) {
      return res.status(400).json({ message: 'Title must be 120 characters or fewer.' });
    }
    if (cleanContent.length > 5000) {
      return res.status(400).json({ message: 'Content must be 5000 characters or fewer.' });
    }

    // Owner comes from the verified JWT, never from the request body.
    const note = await Note.create({ title: cleanTitle, content: cleanContent, user: req.user.id });
    res.status(201).json({ note: toPublicNote(note) });
  } catch (error) {
    console.error('Create note error:', error.message);
    res.status(500).json({ message: 'Could not save the note.' });
  }
};

// GET /api/notes
const getNotes = async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ notes: notes.map(toPublicNote) });
  } catch (error) {
    console.error('Get notes error:', error.message);
    res.status(500).json({ message: 'Could not load notes.' });
  }
};

// DELETE /api/notes/:id
const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;

    if (!OBJECT_ID_PATTERN.test(id)) {
      return res.status(400).json({ message: 'Invalid note ID.' });
    }

    // Ownership is enforced inside the query itself.
    const deleted = await Note.findOneAndDelete({ _id: id, user: req.user.id });

    // 404 for both "does not exist" and "belongs to someone else": reveals nothing.
    if (!deleted) {
      return res.status(404).json({ message: 'Note not found.' });
    }

    res.status(200).json({ message: 'Note deleted.' });
  } catch (error) {
    console.error('Delete note error:', error.message);
    res.status(500).json({ message: 'Could not delete the note.' });
  }
};

module.exports = { createNote, getNotes, deleteNote };
