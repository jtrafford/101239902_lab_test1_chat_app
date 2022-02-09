const express = require('express')
const socketio = require('socket.io')
const app = express()
const path = require('path')
const formatMessage = require('./utils/messages')
const { userJoin, getCurrentUser, userLeave, getRoomUsers } = require('./utils/users')

//mongoDB
const mongoose = require('mongoose')
const mongoDB = 'mongodb+srv://jilliantrafford:fullstack@comp3123.on7h9.mongodb.net/chat_app?retryWrites=true&w=majority'
const Msg = require('./models/mongooseMessages')


const http = require('http')
const server = http.createServer(app)
const io = socketio(server)

//connect to MongoDB
mongoose.connect(mongoDB).then(() =>{
    console.log('MongoDB Connected.')
}).catch(err => console.log(err))


//Set static folder
app.use(express.static(path.join(__dirname, 'public')))

const botName = 'Admin'

//Run when client conenects
io.on('connection', socket =>{
    Msg.find().then(result => {
        socket.emit('output-messages', result)
    })

    socket.on('joinRoom', ({ username, room }) =>{
        const user = userJoin(socket.id, username, room)

        socket.join(user.room)

        //Welcome current user
        socket.emit('message', formatMessage(botName, 'Welcome to Jolteon!'))

        //Broadcast when user connects
        socket.broadcast.to(user.room).emit('message', formatMessage(botName, `${user.username} has joined the chat!`))


        // send users and room info
        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getRoomUsers(user.room)
        })
    })
    
    

    // Listen for chatMessage
    socket.on('chatMessage', (msg) => {
        const message = new Msg({msg})
        message.save().then(() =>{
            io.to(user.room).emit('message', formatMessage(user.username, msg))
        })
        const user = getCurrentUser(socket.id)
    })

    //Runs when client disconnects
    socket.on('disconnect', () =>{
        const user = userLeave(socket.id)

        if(user) {
            io.to(user.room).emit('message', formatMessage(botName, `${user.username} has left the chat.`))
            
        // send users and room info
        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getRoomUsers(user.room)
        })
        }
    })

    

})

const PORT = 3000 || process.env.PORT

server.listen(PORT, () => console.log(`Server running on port ${PORT}`))

