import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

let onlineUsers = [];

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      
      // Intercept internal socket messages
      if (parsedUrl.pathname === '/api/internal/socket' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            io.emit('new_notification', data);
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true }));
          } catch (e) {
            res.statusCode = 400;
            res.end('bad request');
          }
        });
        return;
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(server);
  global.io = io;



  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // User joins with their user info
    socket.on('join', (user) => {
      // user expected to have { id, fullName, nameAbbreviation, avatarUrl }
      const existingUserIndex = onlineUsers.findIndex((u) => u.id === user.id);
      const newUserObj = {
        socketId: socket.id,
        id: user.id,
        fullName: user.fullName,
        nameAbbreviation: user.nameAbbreviation,
        avatarUrl: user.avatarUrl,
        currentPath: user.currentPath || '/'
      };
      
      if (existingUserIndex > -1) {
        onlineUsers[existingUserIndex] = newUserObj;
      } else {
        onlineUsers.push(newUserObj);
      }
      
      io.emit('online_users', onlineUsers);
    });

    // User changes page
    socket.on('view_page', (path) => {
      const uIndex = onlineUsers.findIndex(u => u.socketId === socket.id);
      if (uIndex > -1) {
        onlineUsers[uIndex].currentPath = path;
        io.emit('online_users', onlineUsers);
      }
    });

    // Handle incoming notifications to broadcast
    socket.on('new_notification', (data) => {
      // broadcast to specific user or globally
      if (data.userId) {
        // find socketId for userId
        const targetUsers = onlineUsers.filter(u => u.id === data.userId);
        targetUsers.forEach(tu => {
          io.to(tu.socketId).emit('notification', data);
        });
      } else if (data.userIds && Array.isArray(data.userIds)) {
        data.userIds.forEach(uid => {
          const targetUsers = onlineUsers.filter(u => u.id === uid);
          targetUsers.forEach(tu => {
            io.to(tu.socketId).emit('notification', data);
          });
        });
      } else {
        socket.broadcast.emit('notification', data);
      }
    });

    socket.on('disconnect', () => {
      onlineUsers = onlineUsers.filter((u) => u.socketId !== socket.id);
      io.emit('online_users', onlineUsers);
      console.log('Client disconnected:', socket.id);
    });
  });

  server.once('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
