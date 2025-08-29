import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema(
  {
    product_id:{ type: String, required: true }, 
    product: { type: String, required: true }, // product id or code
    category: { type: String,required: true},
    name: { type: String, required: true }, // product name
    quantity: { type: Number, required: true },
    unit_price: { type: Number, required: true },
    price: { type: Number, required: true }, // total = quantity * unit_price
    created_at: { type: Date, default: Date.now },
    description:{ type: String },
    image:{ type: String },
    created_by: { type: String },
    last_modified_by: { type: String },
    last_modified_at: { type: Date },
  },
  { _id: false } // prevents auto _id for subdocs
);

const OrderSchema = new mongoose.Schema(
  {
    order_id: { type: String, required: true, unique: true }, // custom order ID
    user_id: { type: String, required: true }, // reference to User.user_id
    user_name: { type: String,},
    contact: { type: String,  },
    mail: { type: String, },
    address: { type: String,  },
    description:{ type: String },

    payment_date: { type: String, required: true },
    payment_id: { type: String, required: true },
    payment_type:{ type: String, required: true },
    amount: { type: Number, required: true }, // total order amount

    items: [OrderItemSchema],

    created_at: { type: Date, default: Date.now },
    created_by: { type: String },
    last_modified_by: { type: String },
    last_modified_at: { type: Date },
    order_status: { type: String, default: "pending" }, // pending, paid, shipped, delivered, canceled
  },
  {
    timestamps: false, // you’re handling custom fields
    collection: "orders",
  }
);

export const Order =
  mongoose.models.Order || mongoose.model("Order", OrderSchema);
