var socket = io.connect('http://localhost:5000');

var persona = document.getElementById('persona'),
    contrasena = document.getElementById('contraseña'),
    appChat = document.getElementById('app-chat'),
    panelBienvenida = document.getElementById('panel-bienvenida'),
    usuario = document.getElementById('usuario'),
    mensaje = document.getElementById('mensaje'),
    botonEnviar = document.getElementById('enviar'),
    escribiendoMensaje = document.getElementById('escribiendo-mensaje'),
    output = document.getElementById('output'),
    listaUsuarios = document.getElementById('lista-usuarios');

// Crear un objeto de sonido para la notificación
var sonidoNotificacion = new Audio('/sonido.mp3');

// Función para registrar un nuevo usuario
function registrarUsuario() {
    var nombreDeUsuario = persona.value;
    var contrasenaValor = contrasena.value;

    if (nombreDeUsuario && contrasenaValor.length >= 6) {
        socket.emit('registrarUsuario', { usuario: nombreDeUsuario, contraseña: contrasenaValor });
    } else {
        alert("La contraseña debe tener al menos 6 caracteres.");
    }
}

// Función para ingresar al chat
function ingresarAlChat() {
    var nombreDeUsuario = persona.value;
    var contrasenaValor = contrasena.value;

    if (nombreDeUsuario && contrasenaValor) {
        socket.emit('validarUsuario', { usuario: nombreDeUsuario, contraseña: contrasenaValor });
    } else {
        alert("Por favor ingrese un usuario y una contraseña válidos.");
    }
}

// Al recibir la respuesta de validación del servidor
socket.on('respuestaValidacion', function(data) {
    if (data.validado) {
        panelBienvenida.style.display = "none";
        appChat.style.display = "block";
        usuario.value = data.usuario;
        usuario.readOnly = true;
        socket.emit('nuevoUsuario', data.usuario);
    } else {
        alert('Nombre de usuario o contraseña incorrectos.');
    }
});

// Al hacer clic en el botón de enviar mensaje
botonEnviar.addEventListener('click', function() {
    if (mensaje.value) {
        socket.emit('chat', {
            mensaje: mensaje.value,
            usuario: usuario.value
        });
        mensaje.value = ''; // Limpiar el campo de mensaje después de enviar
    }
});

// Al escribir en el campo de mensaje
mensaje.addEventListener('keyup', function() {
    if (usuario.value) {
        socket.emit('typing', {
            nombre: usuario.value,
            texto: mensaje.value
        });
    }
});

// Recibir mensajes y reproducir sonido de notificación
socket.on('chat', function(data) {
    escribiendoMensaje.innerHTML = '';
    output.innerHTML += '<p><strong>' + data.usuario + ':</strong> ' + data.mensaje + '</p>';

    // Reproducir el sonido de notificación al recibir un mensaje
    sonidoNotificacion.play();
});

// Mostrar quién está escribiendo
socket.on('typing', function(data) {
    if (data.texto) {
        escribiendoMensaje.innerHTML = '<p><em>' + data.nombre + ' está escribiendo un mensaje...</em></p>';
    } else {
        escribiendoMensaje.innerHTML = '';
    }
});

// Actualizar lista de usuarios en línea
socket.on('usuariosEnLinea', function(usuarios) {
    listaUsuarios.innerHTML = ''; // Limpiar lista de usuarios
    usuarios.forEach(function(usuario) {
        listaUsuarios.innerHTML += '<li>' + usuario + '</li>';
    });
});
