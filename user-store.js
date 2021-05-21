class UserStoreMethods {
  saveUser(id, user) {}
  removeUser(id) {}
  findAllUser() {}
  findUser(id) {}
}

class UserStore extends UserStoreMethods {
  constructor() {
    super();
    this.users = new Map();
  }

  saveUser(id, user) {
    this.users.set(id, user);
  }

  removeUser(id) {
    this.users.delete(id);
  }

  findAllUser() {
    return [...this.users.values()];
  }

  findUser(id) {
    return this.users.get(id);
  }
}

module.exports = {
  UserStore,
};
