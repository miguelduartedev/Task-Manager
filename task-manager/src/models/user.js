const mongoose = require('mongoose');
const { isEmail } = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Task = require('./task');

// We can define the Schema directly in the .model function of mongoose
// But keeping it separate allows us to take advantage of the Middleware functions of Mongoose
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      // Trims spaces out of the data
      trim: true,
      // Turns the data into lowercase
      lowercase: true,
      unique: true,
      validate(value) {
        if (!isEmail(value)) {
          throw new Error('Must be an email.');
        }
      },
    },
    age: {
      type: Number,
      trim: true,
      default: 0,
      validate(value) {
        if (value < 0) {
          throw new Error('Age must be a positive number.');
        }
      },
    },
    password: {
      type: String,
      required: true,
      trim: true,
      minlength: 7,
      validate(value) {
        if (value.toLowerCase().includes('password')) {
          throw new Error("Password cannot contain 'Password'");
        }
      },
    },
    tokens: [
      {
        token: {
          type: String,
          required: true,
        },
      },
    ],
    avatar: {
      type: Buffer,
    },
  },
  {
    timestamps: true,
  },
);

// Virtual Property
// Creates a relation to the Tasks entity
userSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'owner',
});

// MIDDLEWARES
// Hash the plain text password before saving
// We need to use function() instead of arrow functions in order to use binding
userSchema.pre('save', async function (next) {
  const user = this;

  // If password was modified, re-hash the code post-save
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }

  next();
});

// Delete User tasks when the user is removed
userSchema.pre('deleteOne', { document: true }, async function (next) {
  const user = this;
  try {
    await Task.deleteMany({ owner: user._id });
    next();
  } catch (e) {
    console.log(e);
  }
});

// When data is parsed to JSON (alters the JSON.stringify method), removes the password and tokens
userSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();

  delete userObject.password;
  delete userObject.tokens;
  delete userObject.avatar;

  return userObject;
};

// Custom Option: findByCredentials
userSchema.statics.findByCredentials = async (email, password) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error('Unable to login');
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new Error('Unable to login');
  }

  return user;
};

// Custom Method: generateAuthToken
// We need to use function() instead of arrow functions in order to use binding (.this)
userSchema.methods.generateAuthToken = async function () {
  const user = this;
  const token = jwt.sign({ _id: user.id.toString() }, process.env.AUTH_TOKEN);

  // Adds the new token to the user tokens (so that he can login to many devices)
  user.tokens = user.tokens.concat({ token });

  await user.save();

  return token;
};

// Defines the Types for "User"
const User = mongoose.model('User', userSchema);

module.exports = User;
