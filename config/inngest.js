import connectDB from "@/config/db";
import Order from "@/models/Order";
import User from "@/models/User";
import { Inngest } from "inngest";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "sapra" });


// Inngest Function to save the user data to a database

export const syncUserCreation  = inngest.createFunction(
    { id : 'sync-user-from-clerk'},
    { event : 'clerk/user.created'},
    async({event})=>{
        const {id, first_name, last_name, email_addresses, image_url} = event.data
        const userData = {
            _id : id,
            email : email_addresses[0].email_address,
            name : first_name + ' '+ last_name,
            imageUrl :image_url
        }
        await connectDB()
        await User.create(userData)
    }
)

// Innest function to update user detail
export const syncUserUpdation = inngest.createFunction(
    {id : 'update-user-from-clerk'},
    {event : 'clerk/user.updated'},
    async ({event})=>{
        const {id, first_name, last_name, email_addresses, image_url} = event.data
        const userData = {
            _id : id,
            email : email_addresses[0].email_address,
            name : first_name + ' '+ last_name,
            imageUrl :image_url
        }
        await connectDB()
        await User.findByIdAndUpdate(id,userData)
    }
)

// Innest function to delete the user
export const syncUserDeletion = inngest.createFunction(
    {id : 'delete-user-from-clerk'},
    {event : 'clerk/user.deleted'},
    async ({event})=>{
        const {id} = event.data
        await connectDB()
        await User.findByIdAndDelete(id)
    }
)


// Inngest Function to create user's Order in database
export const createUserOrder = inngest.createFunction(
  {
    id: "create-user-order",
    batchEvents: {
      maxSize: 5,
      timeout: "5s",
    },
  },
  { event: "order/created" },
  async ({ events }) => {
    try {
      // Validate event data
      const orders = events.map((event) => {
        const { userId, items, amount, address, date } = event.data;
        if (!userId || !items || !amount || !address || !date) {
          throw new Error("Invalid order data in event");
        }
        return {
          userId,
          items,
          amount,
          address,
          date,
        };
      });

      // Connect to database
      await connectDB();

      // Insert orders
      await Order.insertMany(orders);

      return { success: true, processed: orders.length };
    } catch (error) {
      console.error("Error in createUserOrder:", error);
      throw new Error(`Failed to create orders: ${error.message}`);
    }
  }
);