const jwt = require('jsonwebtoken');
const User = require('../models/user');

const auth = async (req, res, next) => {
  try {
    // Gets the Authorization Header of the HTTP request, and extracts the token
    const token = req.header('Authorization')?.replace('Bearer ', '');

    // Returns the ID of the User with this Token
    const decoded = jwt.verify(token, process.env.AUTH_TOKEN);

    // Looks for a User with that Auth Token still stored
    const user = await User.findOne({
      _id: decoded._id,
      'tokens.token': token,
    });

    if (!user) {
      throw new Error();
    }

    // Saves the Token and User into the Request object (acessible through the Routes)
    req.token = token;
    req.user = user;
    next();
  } catch (e) {
    res.status(401).send({ error: 'Please authenticate.' });
  }
};

module.exports = auth;
