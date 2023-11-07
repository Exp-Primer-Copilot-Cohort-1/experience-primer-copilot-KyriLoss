// Create web server
// Create web server
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const { randomBytes } = require('crypto');
const axios = require('axios');

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Data
const commentsByPostId = {};

// Routes
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Create comment
app.post('/posts/:id/comments', async (req, res) => {
  const commentId = randomBytes(4).toString('hex');
  const { content } = req.body;

  // Get comments for post
  const comments = commentsByPostId[req.params.id] || [];

  // Add comment to array
  comments.push({ id: commentId, content, status: 'pending' });

  // Update comments for post
  commentsByPostId[req.params.id] = comments;

  // Emit event to event bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: { id: commentId, content, postId: req.params.id, status: 'pending' },
  });

  res.status(201).send(comments);
});

// Event handler
app.post('/events', async (req, res) => {
  console.log('Received event', req.body.type);

  const { type, data } = req.body;

  if (type === 'CommentModerated') {
    // Destructure data
    const { id, postId, status, content } = data;

    // Get comments for post
    const comments = commentsByPostId[postId];

    // Find comment id
    const comment = comments.find((comment) => comment.id === id);

    // Update status
    comment.status = status;

    // Emit event to event bus
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: { id, postId, status, content },
    });
  }

  res.send({});
});

// Start server
app.listen(4001, () => {
  console.log('Listening on 4001');
});