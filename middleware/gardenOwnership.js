const { ObjectId } = require('mongodb');

function isGardenOwner(garden, user) {
  if (!garden || !user) return false;

  if (garden.owner_email && user.email) {
    return garden.owner_email === user.email;
  }

  if (garden.owner_id && user.id) {
    const ownerId = garden.owner_id.toString();
    const userId = user.id.toString();
    return ownerId === userId;
  }

  return false;
}

function normalizeUserId(id) {
  if (!id) return null;
  return id instanceof ObjectId ? id : new ObjectId(id);
}

module.exports = { isGardenOwner, normalizeUserId };
