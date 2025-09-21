import { inngest } from "@/config/inngest";
import Product from "@/models/Product";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import User from "@/models/User"; // Ensure User model is imported

export async function POST(request) {
  try {
    // Validate authentication
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User not authenticated" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const { address, items } = await request.json();
    if (!address || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Invalid address or items" },
        { status: 400 }
      );
    }

    // Validate items
    for (const item of items) {
      if (!item.product || !item.quantity || item.quantity < 1) {
        return NextResponse.json(
          { success: false, message: "Invalid item data" },
          { status: 400 }
        );
      }
    }

    // Calculate total amount
    const amount = await items.reduce(async (accPromise, item) => {
      const acc = await accPromise;
      const product = await Product.findById(item.product);
      if (!product) {
        throw new Error(`Product not found: ${item.product}`);
      }
      return acc + product.offerPrice * item.quantity;
    }, Promise.resolve(0));

    // Send Inngest event
    await inngest.send({
      name: "order/created",
      data: {
        userId,
        address,
        items,
        amount: amount + Math.floor(amount * 0.02), // Add 2% fee
        date: Date.now(),
      },
    });

    // Clear user's cart
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }
    user.cartItems = {};
    await user.save();

    return NextResponse.json({ success: true, message: "Order placed successfully" });
  } catch (error) {
    console.error("Error in order creation:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}