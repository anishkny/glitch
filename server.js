// Dependencies
const ContextIO = require('contextio')
const Sequelize = require('sequelize')
const bodyParser = require('body-parser')
const express = require('express')
const app = express()

const ApiBase = `https://${process.env.PROJECT_NAME}.glitch.me`

// CIO client config
const CIO = ContextIO({
  key: process.env.CIO_KEY,
  secret: process.env.CIO_SECRET,
  version: 'lite'
})

// Database config
let Users = null

const UsersSchema = {
  email: {
    type: Sequelize.STRING
  },
  cio_id: {
    type: Sequelize.STRING
  },
  messages_moved: {
    type: Sequelize.INTEGER
  }
}

const dbConfig = {
  host: '0.0.0.0',
  dialect: 'sqlite',
  storage: '.data/database.sqlite',
  pool: {
    max: 5,
    min: 0,
    idle: 10000
  }
}

const sequelize = new Sequelize('database', process.env.DB_USER, process.env.DB_PASS, dbConfig)

// Connect to the database + set it up
sequelize.authenticate()
  .then(() => {
    Users = sequelize.define('users', UsersSchema)
    Users.sync()
    // Forcing a sync will delete all existing records
    // Users.sync({force: true})
  })
  .catch(err => {
    console.log('DB connection failed: ', err)
  })

// Server config and endpoints

app.use(bodyParser.json())

// Serve web stuff
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/views/index.html`)
})

// List Users from the DB
app.get('/users', (req, res) => {
  let users = []
  
  Users.findAll()
    .then(rows => { 
      rows.forEach(user => users.push(user))
      res.send(users)
      console.log('Get Users')
    })
})

// Sign up a new user in CIO using connect tokens
app.post('/users', (req, res) => {
  let body = {
    email: req.body.email,
    callback_url: `${ApiBase}/callback`
  }

  CIO.connect_tokens().post(body)
    .then(data => {
      res.send(data)
      console.log(`Connect token created for user ${req.body.email}`)
    })
    .catch(err => res.sendStatus(500))
})

// Handle the connect token response + create the user in the DB
app.get('/callback', (req, res) => {
  let token = req.query.contextio_token

  CIO.connect_tokens(token).get()
    .then(data => {
      res.redirect('/')
      Users.create({email: data.email, cio_id: data.user.id, messages_moved: 0})
      console.log(`User created: ${data.email}`)
    })
    .catch(err => res.sendStatus(500))
})

// Create a webhook from the UI
app.post('/webhook', (req, res) => {
  
  // Pull user from the DB
  Users.findOne({where: {email: req.body.user}})
    .then(user => {
      
      let cio_id = user.get('cio_id')
    
      let webhook = {
        callback_url: `${ApiBase}/webhook/callback`,
        filter_from: req.body.from
      }
      
      // Create webhook in CIO
      CIO.users(cio_id).webhooks().post(webhook)
        .then(data => {
          res.send(data)
          console.log(`Webhook created for messages sent from ${req.body.from} to user ${user.get('email')}`)
        })
        .catch(err => res.sendStatus(500))
    })
    .catch(err => res.sendStatus(500))
  
})

// Handle webhook delivery from CIO
app.post('/webhook/callback', (req, res) => {
  let data = req.body
  Users.findOne({where: {cio_id: data.account_id}})
    .then(user => {
      res.sendStatus(200)
      console.log(`Webhook recieved for user ${user.get('email')} with subject "${data.message_data.subject}"`)
      user.increment('messages_moved')  
    })
    .catch(err => res.sendStatus(500))
})

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
