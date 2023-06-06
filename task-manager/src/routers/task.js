const express = require('express');
const Task = require('../models/task');
const router = new express.Router();
const auth = require('../middleware/auth');

// Create
router.post('/tasks', auth, async (req, res) => {
  const task = new Task({
    ...req.body,
    owner: req.user._id,
  });

  try {
    await task.save();
    res.status(201).send(task);
  } catch (e) {
    res.status(500).send(e);
  }
});

// GET /tasks?completed=true
// GET /tasks?limit=10&skip=0: If I limit by 10 and skip 0, I get the first pagination
// GET /tasks?limit=10&skip=10: If I limit by 10 and skip 10, I get the second pagination
// GET /tasks?sortBy=createdAt:asc
router.get('/tasks', auth, async (req, res) => {
  const match = {};
  const sort = {};

  if (req.query.completed) {
    match.completed = req.query.completed === 'true';
  }

  if (req.query.sortBy) {
    const parts = req.query.sortBy.split(':');
    const filterKey = parts[0];
    const filterValue = parts[1];
    // ASC is 1
    // DESC is -1
    sort[filterKey] = filterValue === 'desc' ? -1 : 1;
  }

  try {
    //const tasks = await Task.find({ owner: req.user._id });

    // Populates the User with his respective tasks
    // Match: Receives an object with the Filters that we want to apply
    await req.user.populate({
      path: 'tasks',
      // Match takes into account the Entity's fields
      match,
      // Options takes into account the in-built Mongoose fields like limit, skip etc.
      options: {
        limit: parseInt(req.query.limit),
        skip: parseInt(req.query.skip),
        sort,
      },
    });

    res.send(req.user.tasks);
  } catch (e) {
    console.log(e);
    res.status(500).send(e);
  }
});

// Read
router.get('/tasks/:id', auth, async (req, res) => {
  const _id = req.params.id;

  try {
    // Finds by ID and checks if current user token is attributed to it
    const taskResult = await Task.findOne({ _id, owner: req.user._id });

    if (!taskResult) {
      return res.status(404).send();
    }

    res.send(taskResult);
  } catch (e) {
    res.status(500).send(e);
  }
});

router.patch('/tasks/:id', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  // Exercise: Define which fields can be allowed to be changed
  const allowedUpdates = ['description', 'completed'];
  // every checks if every element checks the condition (returns true)
  const isValidOperation = updates.every((update) =>
    allowedUpdates.includes(update),
  );

  if (!isValidOperation) {
    return res.status(400).send({ error: 'Invalid update' });
  }

  try {
    const task = await Task.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    // With the key name we can change the correct values
    updates.forEach((update) => (task[update] = req.body[update]));

    // When the Middleware in User.js Model gets executed
    await task.save();

    if (!task) {
      return res.status(404).send();
    }

    res.send(task);
  } catch (e) {
    res.status(500).send(e);
  }
});

router.delete('/tasks/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!task) {
      return res.send(404).send();
    }

    res.send(task);
  } catch (error) {
    res.status(500).send(e);
  }
});

module.exports = router;
