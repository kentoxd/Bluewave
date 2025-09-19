import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyC8hY8hQgrjR22_gBVQWZFMQILXBqHmNXc",
    authDomain: "bluewave-c7585.firebaseapp.com",
    projectId: "bluewave-c7585",
    storageBucket: "bluewave-c7585.firebasestorage.app",
    messagingSenderId: "92975704354",
    appId: "1:92975704354:web:7a5067232334f528da5d7b",
    measurementId: "G-Z3G74PY3YW"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, onSnapshot, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged };
export const sampleRooms = [
    {
        name: "Large Villa",
        price: 12000,
        capacity: 12,
        amenities: ["Air Conditioning", "Kitchen", "Living Area", "Private Veranda", "Pool Access"],
        image: "res/Large Villa.png",
        status: "available",
        description: "Ideal for families or groups - up to 8-12 pax",
        stock: 5,
        totalStock: 5
    },
    {
        name: "Medium Villa",
        price: 7000,
        capacity: 6,
        amenities: ["Air Conditioning", "2 Bedrooms", "Small Kitchen", "Living Space"],
        image: "res/Medium Villa.png",
        status: "available",
        description: "For small families or couples - up to 4-6 pax",
        stock: 5,
        totalStock: 5
    },
    {
        name: "Cottage",
        price: 2500,
        capacity: 10,
        amenities: ["Open-air", "Table & Seating", "Pool Access", "Beach Access"],
        image: "res/Cottages.png",
        status: "available",
        description: "For day-tour guests - 6-10 pax per cottage",
        stock: 5,
        totalStock: 5
    },
    {
        name: "Camping Area",
        price: 800,
        capacity: 20,
        amenities: ["Bonfire", "Common Bathroom", "Open Area", "Activities Space"],
        image: "res/Camping.png",
        status: "available",
        description: "Bonfire space for open-area events",
        stock: 5,
        totalStock: 5
    }
];

export async function initializeSampleData() {
    try {
        const roomsSnapshot = await getDocs(collection(db, "rooms"));
        if (roomsSnapshot.empty) {
            console.log("Initializing sample room data...");
            for (const room of sampleRooms) {
                await addDoc(collection(db, "rooms"), room);
            }
            console.log("Sample data initialized successfully!");
        } else {
            console.log("Rooms already exist in Firebase:", roomsSnapshot.docs.length);
        }
    } catch (error) {
        console.error("Error initializing sample data:", error);
    }
}

export async function forceAddRoomsToFirebase() {
    try {
        console.log("🔄 Force adding rooms to Firebase...");
        
        const roomsSnapshot = await getDocs(collection(db, "rooms"));
        console.log("📋 Current rooms in Firebase:", roomsSnapshot.docs.length);
        
        if (roomsSnapshot.docs.length === 0) {
            console.log("📝 No rooms found, adding all sample rooms...");
            for (const room of sampleRooms) {
                const docRef = await addDoc(collection(db, "rooms"), room);
                console.log("✅ Added room:", room.name, "with ID:", docRef.id);
            }
            console.log("🎉 All rooms added successfully!");
        } else {
            console.log("📋 Rooms already exist, checking if all are present...");
            
            const existingRooms = roomsSnapshot.docs.map(doc => doc.data().name);
            const missingRooms = sampleRooms.filter(room => !existingRooms.includes(room.name));
            
            if (missingRooms.length > 0) {
                console.log("📝 Adding missing rooms:", missingRooms.map(r => r.name));
                for (const room of missingRooms) {
                    const docRef = await addDoc(collection(db, "rooms"), room);
                    console.log("✅ Added missing room:", room.name, "with ID:", docRef.id);
                }
            } else {
                console.log("✅ All rooms are already present in Firebase");
            }
        }
        
        const finalSnapshot = await getDocs(collection(db, "rooms"));
        console.log("📊 Final room count in Firebase:", finalSnapshot.docs.length);
        console.log("🏨 Room names:", finalSnapshot.docs.map(doc => doc.data().name));
        
    } catch (error) {
        console.error("❌ Error force adding rooms to Firebase:", error);
        throw error;
    }
}

export async function resetRoomsInFirebase() {
    try {
        console.log("🗑️ Clearing all rooms from Firebase...");
        
        const roomsSnapshot = await getDocs(collection(db, "rooms"));
        const deletePromises = roomsSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        
        console.log("✅ All rooms cleared from Firebase");
        
        console.log("📝 Adding all sample rooms...");
        for (const room of sampleRooms) {
            const docRef = await addDoc(collection(db, "rooms"), room);
            console.log("✅ Added room:", room.name, "with ID:", docRef.id);
        }
        
        console.log("🎉 Rooms reset and re-added successfully!");
        
    } catch (error) {
        console.error("❌ Error resetting rooms in Firebase:", error);
        throw error;
    }
}

export async function updateRoomStock(roomId, decreaseBy = 1) {
    try {
        console.log(`📦 Updating room stock for room ID: ${roomId}, decreasing by: ${decreaseBy}`);
        
        const roomDoc = await getDocs(query(collection(db, "rooms"), where("__name__", "==", roomId)));
        
        if (!roomDoc.empty) {
            const roomDocSnapshot = roomDoc.docs[0];
            const roomData = roomDocSnapshot.data();
            const newStock = Math.max(0, roomData.stock - decreaseBy);
            const newStatus = newStock > 0 ? "available" : "unavailable";
            
            await updateDoc(roomDocSnapshot.ref, {
                stock: newStock,
                status: newStatus,
                lastUpdated: new Date().toISOString()
            });
            
            console.log(`✅ Room stock updated: ${roomData.name} - Stock: ${roomData.stock} → ${newStock}, Status: ${newStatus}`);
            return { success: true, newStock, newStatus };
        } else {
            console.error("❌ Room not found:", roomId);
            return { success: false, error: "Room not found" };
        }
    } catch (error) {
        console.error("❌ Error updating room stock:", error);
        return { success: false, error: error.message };
    }
}

export async function restoreRoomStock(roomId, increaseBy = 1) {
    try {
        console.log(`📦 Restoring room stock for room ID: ${roomId}, increasing by: ${increaseBy}`);
        
        const roomDoc = await getDocs(query(collection(db, "rooms"), where("__name__", "==", roomId)));
        
        if (!roomDoc.empty) {
            const roomDocSnapshot = roomDoc.docs[0];
            const roomData = roomDocSnapshot.data();
            const newStock = Math.min(roomData.totalStock, roomData.stock + increaseBy);
            const newStatus = newStock > 0 ? "available" : "unavailable";
            
            await updateDoc(roomDocSnapshot.ref, {
                stock: newStock,
                status: newStatus,
                lastUpdated: new Date().toISOString()
            });
            
            console.log(`✅ Room stock restored: ${roomData.name} - Stock: ${roomData.stock} → ${newStock}, Status: ${newStatus}`);
            return { success: true, newStock, newStatus };
        } else {
            console.error("❌ Room not found:", roomId);
            return { success: false, error: "Room not found" };
        }
    } catch (error) {
        console.error("❌ Error restoring room stock:", error);
        return { success: false, error: error.message };
    }
}

export async function checkRoomAvailability(roomId) {
    try {
        console.log(`🔍 Checking room availability for room ID: ${roomId}`);
        
        const roomDoc = await getDocs(query(collection(db, "rooms"), where("__name__", "==", roomId)));
        
        if (!roomDoc.empty) {
            const roomData = roomDoc.docs[0].data();
            const isAvailable = roomData.stock > 0 && roomData.status === "available";
            
            console.log(`🔍 Room availability check: ${roomData.name} - Stock: ${roomData.stock}, Status: ${roomData.status}, Available: ${isAvailable}`);
            return { 
                available: isAvailable, 
                stock: roomData.stock, 
                status: roomData.status,
                roomName: roomData.name 
            };
        } else {
            console.error("❌ Room not found:", roomId);
            return { available: false, error: "Room not found" };
        }
    } catch (error) {
        console.error("❌ Error checking room availability:", error);
        return { available: false, error: error.message };
    }
}

export async function resetAllRoomsToFullStock() {
    try {
        console.log('🔄 Resetting all rooms to full stock...');
        
        const roomsSnapshot = await getDocs(collection(db, "rooms"));
        const updatePromises = roomsSnapshot.docs.map(async (doc) => {
            const roomData = doc.data();
            await updateDoc(doc.ref, {
                stock: 5,
                totalStock: 5,
                status: "available",
                lastUpdated: new Date().toISOString()
            });
            console.log(`✅ Reset ${roomData.name} to full stock (5/5)`);
        });
        
        await Promise.all(updatePromises);
        console.log('🎉 All rooms reset to full stock successfully!');
        
        return { success: true, message: "All rooms reset to full stock" };
        
    } catch (error) {
        console.error('❌ Error resetting rooms to full stock:', error);
        return { success: false, error: error.message };
    }
}
