const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const { ServerApiVersion, deserialize } = require('mongodb');
require('dotenv').config();

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

app.use(express.json()); // 解析 JSON 格式的请求正文
app.use(express.urlencoded({ extended: true })); // 解析 URL 编码格式的请求正文

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 })
  .then(() => {
    console.log('Connected to MongoDB');
  }).catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });

const userSchema = new mongoose.Schema({
  username: String,
});
const User = mongoose.model('User', userSchema);
userSchema.set('versionKey', false);

const exerciseSchema = new mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: Date,
})
const Exercise = mongoose.model('Exercise', exerciseSchema);
exerciseSchema.set('versionKey', false);


app.post('/api/users', async (req, res) => {
  console.log("Post: ", req.body);
  try {
    const username = req.body.username;
    const user = await User.findOneAndUpdate({ username }, { username }, { new: true, upsert: true });
    console.log("  Send: ", user);
    res.json(user)
  } catch (error) {
    console.error('Error creating user:', error);
    res.json({ error: 'Error creating user' });
  }
});

app.get('/api/users/', async (req, res) => {
  console.log("Get");
  try {
    const users = await User.find().select("username _id");
    console.log("  Send: ", users);
    res.json(users)
  } catch (error) {
    console.error('Error get all users:', error);
    res.json({ error: 'Error get all users' });
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  console.log("Post: ", req.params._id, req.body);
  const body = req.body;
  try {
    const user = await User.findById(req.params._id);
    const exerciseObj = {
      username: user.username,
      description: body.description,
      duration: body.duration,
      date: new Date(body.date || Date.now()),
    }
    const exercise = new Exercise(exerciseObj);
    const saveExercise = await exercise.save();
    console.log("  Save: ", saveExercise);
    const resObj = {
      ...saveExercise.toObject(),
      ...user.toObject(),
      date: new Date(saveExercise.date).toDateString(),
    }
    console.log("  Send: ", resObj);
    res.json(resObj);
  } catch (error) {
    console.error('Error submit exercise', error);
    res.json({ error: 'Error submit exercise' });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  console.log("Get logs: ", req.query);
  try {
    const user = await User.findById(req.params._id);
    const filter = { username: user.username, date: { $exists: true } };
    if (req.query.from) {
      filter.date.$gte = new Date(req.query.from);
    }
    if (req.query.to) {
      filter.date.$lte = new Date(req.query.to);
    }
    let findQuery = Exercise.find(filter).select("description duration date -_id");
    if (req.query.limit) {
      findQuery = findQuery.limit(req.query.limit);
    }
    console.log("Q: ", filter)
    const exercises = await findQuery.exec();
    const resObj = {
      ...user.toObject(),
      count: exercises.length,
      log: exercises.map(exe => { return { ...exe.toObject(), date: new Date(exe.date).toDateString() } }),
    }
    console.log("  Send: ", resObj);
    res.json(resObj);
  } catch (error) {
    const errStr = 'Error get exercise logs';
    console.error(errStr, error);
    res.json({ error: errStr });
  }
});

app.get('/api/delete', async (req, res) => {
  console.log("Delete all");
  try {
    const deleteUser = await User.deleteMany({});
    console.log(deleteUser);
    const deleteExerceise = await Exercise.deleteMany({});
    console.log(deleteExerceise);
    res.json({ result: "Done" });;
  } catch (error) {
    const errStr = 'Error get exercise logs';
    console.error(errStr, error);
    res.json({ error: errStr });
  }

})