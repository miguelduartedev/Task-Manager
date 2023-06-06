const express = require('express');
const User = require('../models/user');
const router = new express.Router();
const auth = require('../middleware/auth');
const multer = require('multer');
const sharp = require('sharp');
const { sendWelcomeEmail, sendCancelationEmail } = require('../emails/account');

// GET: User data
router.get('/users/me', auth, async (req, res) => {
  // User is inseted into Req inside Auth
  res.send(req.user);
});

// GET: User Avatar
router.get('/users/me/avatar', auth, async (req, res) => {
  try {
    res.set('Content-Type', 'image/jpg');
    res.status(200).send(req.user.avatar);
  } catch (e) {
    res.status(404).send();
  }
});

// POST: Sign in
router.post('/users', async (req, res) => {
  const user = new User(req.body);

  // Everything afterwards will only run after user is .saved()
  try {
    const token = await user.generateAuthToken();
    await user.save();
    sendWelcomeEmail(user.email, user.name);
    res.status(201).send({ user, token });
  } catch (e) {
    res.status(400).send(e);
  }
});

// POST: Login
router.post('/users/login', async (req, res) => {
  try {
    // Custom Option: findByCredentials
    const user = await User.findByCredentials(
      req.body.email,
      req.body.password,
    );

    // Custom Method: Generates token
    const token = await user.generateAuthToken();
    res.send({ user, token });
  } catch (e) {
    res.status(400).send(e);
  }
});

// POST: Log Out off a singular device
router.post('/users/logout', auth, async (req, res) => {
  try {
    // Only log out of the device being used in the moment of log out
    req.user.tokens = req.user.tokens.filter((token) => {
      return token.token !== req.token;
    });

    await req.user.save();

    res.send();
  } catch (e) {
    res.status(500).send(e);
  }
});

// POST: Log Out on all devices
router.post('/users/logoutAll', auth, async (req, res) => {
  try {
    req.user.tokens = [];

    await req.user.save();

    res.status(200).send(req.user);
  } catch (e) {
    res.status(500).send(e);
  }
});

// Defines the folder where the uploads will be stored and the file size limit and the file extensions allowed
const upload = multer({
  limits: {
    // 1MB file size limit
    fileSize: 1000000,
  },
  fileFilter(req, file, callback) {
    // If we only wanted .jpg, .jpeg or .png files
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return callback(
        new Error(
          'Please upload an image with one of the following extensions: .jpg, .jpeg or .png',
        ),
      );
    }
    callback(undefined, true);
  },
});

// POST: Add User Profile Picture
router.post(
  '/users/me/avatar',
  auth,
  upload.single('avatar'),
  async (req, res) => {
    //req.user.avatar = req.file.buffer;
    const compressedAvatar = await sharp(req.file.buffer)
      .resize({ width: 250, height: 250 })
      .jpeg()
      .toBuffer();

    req.user.avatar = compressedAvatar;

    await req.user.save();

    res.status(200).send();
  },
  (error, req, res, next) => {
    res.status(400).send({ error: error.message });
  },
);

// PATCH
router.patch('/users/me', auth, async (req, res) => {
  // The Object Keys of the requested change
  const updates = Object.keys(req.body);
  // Exercise: Define which fields can be allowed to be changed
  const allowedUpdates = ['name', 'email', 'password', 'age'];
  // every checks if every element checks the condition (returns true)
  const isValidOperation = updates.every((update) =>
    allowedUpdates.includes(update),
  );

  if (!isValidOperation) {
    return res.status(400).send({ error: 'Invalid update' });
  }

  try {
    const user = await User.findById(req.user._id);

    // With the key name we can change the correct values
    updates.forEach((update) => (user[update] = req.body[update]));

    // When the Middleware in User.js Model gets executed
    await user.save();

    if (!user) {
      return res.status(404).send();
    }

    res.send(user);
  } catch (e) {
    console.log(e);
    res.status(500).send(e);
  }
});

// DELETE Profile
router.delete('/users/me', auth, async (req, res) => {
  try {
    sendCancelationEmail(req.user.email, req.user.name);
    await req.user.deleteOne();
    res.status(200).send(req.user);
  } catch (e) {
    res.status(500).send(e);
  }
});

// DELETE Avatar
router.delete('/users/me/avatar', auth, async (req, res) => {
  try {
    req.user.avatar = undefined;
    await req.user.save();
    res.status(200).send(req.user);
  } catch (e) {
    res.status(500).send(e);
  }
});

module.exports = router;
