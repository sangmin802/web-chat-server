class RoomStoreMethods {
  saveRoom(id, room) {}
  removeRoom(id) {}
  findAllRoom() {}
}

class RoomStore extends RoomStoreMethods {
  constructor() {
    super();
    this.rooms = new Map();
  }

  saveRoom(id, room) {
    this.rooms.set(id, room);
  }

  removeRoom(id) {
    this.rooms.delete(id);
  }

  findRoom(id) {
    return this.rooms.get(id);
  }

  findAllRoom() {
    return [...this.rooms.values()];
  }
}

module.exports = {
  RoomStore,
};
