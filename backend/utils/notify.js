/**
 * Central notification helper
 * Call createNotification() from any controller to create + emit a notification
 */
const Notification = require('../models/Notification');

const createNotification = async (io, { recipient, sender, type, refId, refModel, text }) => {
  // Don't notify yourself
  if (recipient.toString() === sender.toString()) return;

  const notif = await Notification.create({ recipient, sender, type, refId, refModel, text });
  await notif.populate('sender', 'displayName avatar');

  // Real-time push via socket
  if (io) {
    io.to(`user:${recipient}`).emit('notification', { notification: notif });
  }

  return notif;
};

module.exports = { createNotification };