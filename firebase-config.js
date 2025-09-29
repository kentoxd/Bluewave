import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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

export { db, auth, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, onSnapshot, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile };
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


export async function forceAddRoomsToFirebase() {
    try {
        
        
        const roomsSnapshot = await getDocs(collection(db, "rooms"));
        
        
        if (roomsSnapshot.docs.length === 0) {
            
            for (const room of sampleRooms) {
                const docRef = await addDoc(collection(db, "rooms"), room);
                
            }
            
        } else {
            
            
            const existingRooms = roomsSnapshot.docs.map(doc => doc.data().name);
            const missingRooms = sampleRooms.filter(room => !existingRooms.includes(room.name));
            
            if (missingRooms.length > 0) {
                
                for (const room of missingRooms) {
                    const docRef = await addDoc(collection(db, "rooms"), room);
                    
                }
            } else {
                
            }
        }
        
        const finalSnapshot = await getDocs(collection(db, "rooms"));
        
        
        
    } catch (error) {
        
        throw error;
    }
}


export async function updateRoomStock(roomId, decreaseBy = 1) {
    try {
        
        
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
            
            
            return { success: true, newStock, newStatus };
        } else {
            
            return { success: false, error: "Room not found" };
        }
    } catch (error) {
        
        return { success: false, error: error.message };
    }
}

export async function restoreRoomStock(roomId, increaseBy = 1) {
    try {
        
        
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
            
            
            return { success: true, newStock, newStatus };
        } else {
            
            return { success: false, error: "Room not found" };
        }
    } catch (error) {
        
        return { success: false, error: error.message };
    }
}

export async function checkRoomAvailability(roomId) {
    try {
        
        
        const roomDoc = await getDocs(query(collection(db, "rooms"), where("__name__", "==", roomId)));
        
        if (!roomDoc.empty) {
            const roomData = roomDoc.docs[0].data();
            const isAvailable = roomData.stock > 0 && roomData.status === "available";
            
            
            return { 
                available: isAvailable, 
                stock: roomData.stock, 
                status: roomData.status,
                roomName: roomData.name 
            };
        } else {
            
            return { available: false, error: "Room not found" };
        }
    } catch (error) {
        
        return { available: false, error: error.message };
    }
}

export async function cleanupDuplicateRooms() {
    try {
        
        
        const roomsSnapshot = await getDocs(collection(db, "rooms"));
        const rooms = roomsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Group rooms by name to find duplicates
        const roomGroups = {};
        rooms.forEach(room => {
            if (!roomGroups[room.name]) {
                roomGroups[room.name] = [];
            }
            roomGroups[room.name].push(room);
        });
        
        let duplicatesRemoved = 0;
        
        // Process each group
        for (const [roomName, roomList] of Object.entries(roomGroups)) {
            if (roomList.length > 1) {
                
                
                // Keep the first room, delete the rest
                const roomsToDelete = roomList.slice(1);
                
                for (const roomToDelete of roomsToDelete) {
                    await deleteDoc(doc(db, "rooms", roomToDelete.id));
                    
                    duplicatesRemoved++;
                }
            }
        }
        
        
        return { success: true, duplicatesRemoved };
        
    } catch (error) {
        
        return { success: false, error: error.message };
    }
}

