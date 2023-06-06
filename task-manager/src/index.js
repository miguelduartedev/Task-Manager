const express = require('express');
require('./db/mongoose');
const userRouter = require('./routers/user');
const userTask = require('./routers/task');
const jwt = require('jsonwebtoken');
const Task = require('./models/task');
const User = require('./models/user');

const app = express();
const port = process.env.PORT;

// Automatically parses json into an object
app.use(express.json());
// Defines routes
app.use(userRouter);
app.use(userTask);

app.listen(port, () => {
  console.log('Server is up on port: ' + port);
});

module.exports = app;
