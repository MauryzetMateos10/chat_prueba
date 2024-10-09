const express = require('express');
const socket = require('socket.io');
const mongoose = require('mongoose');
const http = require('http');
const uuidv4 = require('uuid/v4'); // Importar uuidv4

const app = express();

// Servidor HTTP
const serverHttp = http.createServer(app);
serverHttp.listen(process.env.HTTP_PORT, process.env.IP);
serverHttp.on('listening', () => console.info(`Notes App running at http://${process.env.IP}:${process.env.HTTP_PORT}`));

// Contenido estático
app.use(express.static('./public'));

// API
app.get('/api/get-uuid', function (req, res) {
    res.send(uuidv4()); // Generar UUID
});

// 404
app.get('*', function (req, res) {
    res.status(404).send('Error 404 - Recurso no encontrado');
});

// Conectar a MongoDB
mongoose.connect('mongodb://localhost/chatDB', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Conectado a la base de datos MongoDB'))
    .catch(err => console.error('Error de conexión a MongoDB:', err));

// Esquema de usuario
const UsuarioSchema = new mongoose.Schema({
    usuario: { type: String, unique: true },
    contraseña: String
});

const Usuario = mongoose.model('Usuario', UsuarioSchema);

// Esquema de mensaje
const MensajeSchema = new mongoose.Schema({
    usuario: String,
    mensaje: String,
    fecha: { type: Date, default: Date.now }
});

const Mensaje = mongoose.model('Mensaje', MensajeSchema);

// Iniciar servidor
const server = app.listen(process.env.PORT || 3000, '0.0.0.0', () => {
    console.log(`Servidor escuchando en puerto ${process.env.PORT || 3000}...`);
});

// Configurar socket.io
const io = socket(server);
let usuariosEnLinea = [];

// Manejar conexión de sockets
io.on('connection', socket => {
    console.log('Nueva conexión: ' + socket.id);

    // Cargar mensajes existentes desde MongoDB
    Mensaje.find().sort('fecha')
        .then(mensajes => socket.emit('cargarMensajes', mensajes))
        .catch(err => console.error('Error al cargar los mensajes:', err));

    // Recibir nuevo mensaje de chat
    socket.on('chat', data => {
        const nuevoMensaje = new Mensaje({
            usuario: data.usuario,
            mensaje: data.mensaje
        });

        nuevoMensaje.save()
            .then(() => io.sockets.emit('chat', data))
            .catch(err => console.error('Error al guardar el mensaje:', err));
    });

    // Registrar nuevo usuario
    socket.on('registrarUsuario', data => {
        const nuevoUsuario = new Usuario({
            usuario: data.usuario,
            contraseña: data.contraseña
        });

        nuevoUsuario.save()
            .then(() => socket.emit('respuestaValidacion', { validado: true, usuario: data.usuario }))
            .catch(err => {
                console.error('Error al registrar el usuario:', err);
                socket.emit('respuestaValidacion', { validado: false });
            });
    });

    // Validar usuario en inicio de sesión
    socket.on('validarUsuario', data => {
        Usuario.findOne({ usuario: data.usuario, contraseña: data.contraseña })
            .then(usuario => {
                if (usuario) {
                    socket.emit('respuestaValidacion', { validado: true, usuario: usuario.usuario });
                } else {
                    socket.emit('respuestaValidacion', { validado: false });
                }
            })
            .catch(err => {
                console.error('Error al validar usuario:', err);
                socket.emit('respuestaValidacion', { validado: false });
            });
    });

    // Nuevo usuario en línea
    socket.on('nuevoUsuario', nombreUsuario => {
        if (!usuariosEnLinea.includes(nombreUsuario)) {
            usuariosEnLinea.push(nombreUsuario);
            io.sockets.emit('usuariosEnLinea', usuariosEnLinea);
            socket.username = nombreUsuario; // Asignar el nombre de usuario al socket
        }
    });

    // Usuario está escribiendo
    socket.on('typing', data => {
        socket.broadcast.emit('typing', data);
    });

    // Desconectar usuario
    socket.on('disconnect', () => {
        if (socket.username) {
            usuariosEnLinea = usuariosEnLinea.filter(usuario => usuario !== socket.username);
            io.sockets.emit('usuariosEnLinea', usuariosEnLinea);
        }
        console.log(`Usuario desconectado: ${socket.id}`);
    });
});
