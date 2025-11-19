const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "User",
  tableName: "users",
  columns: {
    id: { primary: true, type: "int", generated: true },
    name: { type: "varchar", nullable: false },
    email: { type: "varchar", unique: true },
    password: { type: "varchar", nullable: false },
    role: { type: "varchar", default: "user" },
    created_at: { type: "timestamp", createDate: true },
  },
});
