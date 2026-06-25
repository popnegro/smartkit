const jwt = require('jsonwebtoken');
const { config } = require('./config');

module.exports = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    }

    try {
        const verified = jwt.verify(token, config.jwtSecret);
        req.user = verified;
        next();
    } catch (err) {
        res.status(403).json({ error: 'Token inválido o expirado.' });
    }
};