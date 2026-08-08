javascript
/* =====================================================
   COMME MESSENGER
   Firebase Authentication + Firestore Realtime Chat
   ===================================================== */

import { initializeApp } from
"https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from
"https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from
"https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


/* =====================================================
   FIREBASE CONFIGURATION
   ===================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyClvmIluOTr96EgH1WPAaQNC_1IMXcshQE",
  authDomain: "comtine-436b6.firebaseapp.com",
  projectId: "comtine-436b6",
  storageBucket: "comtine-436b6.firebasestorage.app",
  messagingSenderId: "54469012189",
  appId: "1:54469012189:web:23592f94aa26bdc5e30934",
  measurementId: "G-HF4B8E429E"
};


/* =====================================================
   INITIALIZE FIREBASE
   ===================================================== */

const firebaseApp = initializeApp(firebaseConfig);

const auth = getAuth(firebaseApp);

const db = getFirestore(firebaseApp);


/* =====================================================
   APPLICATION STATE
   ===================================================== */

let currentUser = null;
let currentProfile = null;
let selectedUser = null;

let unsubscribeMessages = null;
let unsubscribeProfile = null;


/* =====================================================
   HTML ELEMENTS
   ===================================================== */

const loginPage =
  document.getElementById("loginPage");

const registerPage =
  document.getElementById("registerPage");

const appPage =
  document.getElementById("app");

const usersDiv =
  document.getElementById("users");

const messagesDiv =
  document.getElementById("messages");

const emptyChat =
  document.getElementById("emptyChat");

const chatArea =
  document.getElementById("chatArea");

const messenger =
  document.querySelector(".messenger");


/* =====================================================
   LOGIN / REGISTER PAGE SWITCH
   ===================================================== */

document
  .getElementById("showRegisterBtn")
  .addEventListener("click", () => {

    loginPage.classList.add("hidden");

    registerPage.classList.remove("hidden");

  });


document
  .getElementById("showLoginBtn")
  .addEventListener("click", () => {

    registerPage.classList.add("hidden");

    loginPage.classList.remove("hidden");

  });


/* =====================================================
   CREATE ACCOUNT
   ===================================================== */

document
  .getElementById("registerBtn")
  .addEventListener("click", registerAccount);


async function registerAccount() {

  const error =
    document.getElementById("registerError");

  error.textContent = "";

  const username =
    document
      .getElementById("registerUsername")
      .value
      .trim();

  const email =
    document
      .getElementById("registerEmail")
      .value
      .trim();

  const password =
    document
      .getElementById("registerPassword")
      .value;

  const confirmPassword =
    document
      .getElementById("confirmPassword")
      .value;


  if (
    !username ||
    !email ||
    !password ||
    !confirmPassword
  ) {

    error.textContent =
      "Please fill in all fields.";

    return;
  }


  if (username.length < 3) {

    error.textContent =
      "Nickname must be at least 3 characters.";

    return;
  }


  if (password.length < 6) {

    error.textContent =
      "Password must be at least 6 characters.";

    return;
  }


  if (password !== confirmPassword) {

    error.textContent =
      "Passwords do not match.";

    return;
  }


  try {

    const result =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );


    const user =
      result.user;


    await setDoc(
      doc(db, "users", user.uid),
      {
        uid: user.uid,
        username: username,
        usernameLower: username.toLowerCase(),
        email: email,
        bio: "",
        friends: [],
        createdAt: serverTimestamp()
      }
    );


  } catch (errorObject) {

    console.error(
      "Registration error:",
      errorObject
    );

    error.textContent =
      firebaseError(errorObject.code);

  }

}


/* =====================================================
   LOGIN
   ===================================================== */

document
  .getElementById("loginBtn")
  .addEventListener("click", loginAccount);


async function loginAccount() {

  const error =
    document.getElementById("loginError");

  error.textContent = "";


  const email =
    document
      .getElementById("loginEmail")
      .value
      .trim();

  const password =
    document
      .getElementById("loginPassword")
      .value;


  if (!email || !password) {

    error.textContent =
      "Enter your email and password.";

    return;
  }


  try {

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

  } catch (errorObject) {

    console.error(
      "Login error:",
      errorObject
    );

    error.textContent =
      firebaseError(errorObject.code);

  }

}


/* =====================================================
   ENTER KEY LOGIN
   ===================================================== */

document
  .getElementById("loginPassword")
  .addEventListener("keydown", event => {

    if (event.key === "Enter") {

      loginAccount();

    }

  });


/* =====================================================
   AUTH STATE
   ===================================================== */

onAuthStateChanged(
  auth,
  async user => {

    if (user) {

      currentUser = user;

      await loadProfile();

      showMessenger();

      startProfileListener();

      await renderFriends();

    } else {

      currentUser = null;

      currentProfile = null;

      selectedUser = null;

      stopListeners();

      showLogin();

    }

  }
);


/* =====================================================
   SHOW LOGIN
   ===================================================== */

function showLogin() {

  appPage.classList.add("hidden");

  registerPage.classList.add("hidden");

  loginPage.classList.remove("hidden");

}


/* =====================================================
   SHOW MESSENGER
   ===================================================== */

function showMessenger() {

  loginPage.classList.add("hidden");

  registerPage.classList.add("hidden");

  appPage.classList.remove("hidden");

}


/* =====================================================
   LOAD CURRENT PROFILE
   ===================================================== */

async function loadProfile() {

  const profileRef =
    doc(
      db,
      "users",
      currentUser.uid
    );


  const snapshot =
    await getDoc(profileRef);


  if (!snapshot.exists()) {

    console.error(
      "User profile was not found."
    );

    return;

  }


  currentProfile =
    snapshot.data();


  updateMyProfileUI();

}


/* =====================================================
   REALTIME PROFILE LISTENER
   ===================================================== */

function startProfileListener() {

  if (unsubscribeProfile) {

    unsubscribeProfile();

  }


  const profileRef =
    doc(
      db,
      "users",
      currentUser.uid
    );


  unsubscribeProfile =
    onSnapshot(
      profileRef,
      snapshot => {

        if (!snapshot.exists()) {
          return;
        }


        currentProfile =
          snapshot.data();


        updateMyProfileUI();


        const friendsTab =
          document.getElementById(
            "friendsTab"
          );


        if (
          friendsTab.classList.contains(
            "active"
          )
        ) {

          renderFriends();

        }

      },
      error => {

        console.error(
          "Profile listener error:",
          error
        );

      }
    );

}


/* =====================================================
   UPDATE PROFILE UI
   ===================================================== */

function updateMyProfileUI() {

  if (!currentProfile) {
    return;
  }


  document.getElementById(
    "myUsername"
  ).textContent =
    currentProfile.username || "User";


  document.getElementById(
    "myEmail"
  ).textContent =
    currentProfile.email || "";


  setAvatar(
    document.getElementById("myAvatar"),
    currentProfile
  );

}


/* =====================================================
   AVATAR
   ===================================================== */

function setAvatar(element, user) {

  if (!element) {
    return;
  }


  const username =
    user?.username || "U";


  element.textContent =
    username
      .charAt(0)
      .toUpperCase();

}


/* =====================================================
   FRIENDS TAB
   ===================================================== */

document
  .getElementById("friendsTab")
  .addEventListener(
    "click",
    async () => {

      setActiveTab("friends");

      await renderFriends();

    }
  );


/* =====================================================
   PEOPLE TAB
   ===================================================== */

document
  .getElementById("peopleTab")
  .addEventListener(
    "click",
    async () => {

      setActiveTab("people");

      await loadPeople();

    }
  );


/* =====================================================
   SET ACTIVE TAB
   ===================================================== */

function setActiveTab(tab) {

  const friendsTab =
    document.getElementById(
      "friendsTab"
    );

  const peopleTab =
    document.getElementById(
      "peopleTab"
    );


  if (tab === "friends") {

    friendsTab.classList.add("active");

    peopleTab.classList.remove("active");

  } else {

    peopleTab.classList.add("active");

    friendsTab.classList.remove("active");

  }

}


/* =====================================================
   RENDER FRIENDS
   ===================================================== */

async function renderFriends() {

  usersDiv.innerHTML = "";


  if (!currentProfile) {
    return;
  }


  const friendIds =
    Array.isArray(currentProfile.friends)
      ? currentProfile.friends
      : [];


  if (friendIds.length === 0) {

    usersDiv.innerHTML = `
      <div style="
        padding:30px 20px;
        text-align:center;
        color:#85859b;
      ">
        <div style="
          font-size:40px;
          margin-bottom:10px;
        ">
          👥
        </div>

        <strong>No friends yet</strong>

        <p style="
          margin-top:7px;
          font-size:13px;
        ">
          Open People and add someone.
        </p>
      </div>
    `;

    return;

  }


  for (const friendId of friendIds) {

    try {

      const snapshot =
        await getDoc(
          doc(
            db,
            "users",
            friendId
          )
        );


      if (snapshot.exists()) {

        createUserElement(
          snapshot.data(),
          false
        );

      }

    } catch (error) {

      console.error(
        "Could not load friend:",
        error
      );

    }

  }

}


/* =====================================================
   LOAD PEOPLE
   ===================================================== */

async function loadPeople() {

  usersDiv.innerHTML = "";


  try {

    const snapshot =
      await getDocs(
        collection(
          db,
          "users"
        )
      );


    let count = 0;


    snapshot.forEach(item => {

      const user =
        item.data();


      if (
        currentUser &&
        user.uid === currentUser.uid
      ) {

        return;

      }


      createUserElement(
        user,
        true
      );


      count++;

    });


    if (count === 0) {

      usersDiv.innerHTML = `
        <div style="
          padding:30px;
          text-align:center;
          color:#85859b;
        ">
          No other users found.
        </div>
      `;

    }

  } catch (error) {

    console.error(
      "Could not load users:",
      error
    );


    usersDiv.innerHTML = `
      <div style="
        padding:20px;
        color:#e74c3c;
        text-align:center;
      ">
        Could not load users.
      </div>
    `;

  }

}


/* =====================================================
   CREATE USER ITEM
   ===================================================== */

function createUserElement(
  user,
  showFriendButton
) {

  const div =
    document.createElement("div");

  div.className = "user";

  div.dataset.username =
    (
      user.usernameLower ||
      user.username ||
      ""
    ).toLowerCase();


  const avatar =
    document.createElement("div");

  avatar.className = "avatar";

  setAvatar(
    avatar,
    user
  );


  const info =
    document.createElement("div");

  info.className = "user-info";


  const name =
    document.createElement("strong");

  name.textContent =
    user.username || "User";


  const status =
    document.createElement("span");

  status.textContent =
    user.bio ||
    "Comme Messenger";


  info.appendChild(name);

  info.appendChild(status);


  div.appendChild(avatar);

  div.appendChild(info);


  if (showFriendButton) {

    const friendButton =
      document.createElement("button");

    friendButton.className =
      "friend-btn";


    const isFriend =
      getFriendIds()
        .includes(user.uid);


    friendButton.textContent =
      isFriend
        ? "Remove"
        : "Add";


    friendButton.addEventListener(
      "click",
      async event => {

        event.stopPropagation();


        await toggleFriend(
          user.uid,
          isFriend
        );

      }
    );


    div.appendChild(
      friendButton
    );

  }


  div.addEventListener(
    "click",
    () => {

      const isFriend =
        getFriendIds()
          .includes(user.uid);


      if (
        !showFriendButton ||
        isFriend
      ) {

        document
          .querySelectorAll(".user")
          .forEach(item => {

            item.classList.remove(
              "active"
            );

          });


        div.classList.add(
          "active"
        );


        openChat(user);

      }

    }
  );


  usersDiv.appendChild(div);

}


/* =====================================================
   GET FRIEND IDS
   ===================================================== */

function getFriendIds() {

  if (!currentProfile) {
    return [];
  }


  return Array.isArray(
    currentProfile.friends
  )
    ? currentProfile.friends
    : [];

}


/* =====================================================
   ADD / REMOVE FRIEND
   ===================================================== */

async function toggleFriend(
  targetUid,
  currentlyFriend
) {

  if (!currentUser) {
    return;
  }


  try {

    const myRef =
      doc(
        db,
        "users",
        currentUser.uid
      );


    const targetRef =
      doc(
        db,
        "users",
        targetUid
      );


    if (currentlyFriend) {

      await updateDoc(
        myRef,
        {
          friends:
            arrayRemove(
              targetUid
            )
        }
      );


      await updateDoc(
        targetRef,
        {
          friends:
            arrayRemove(
              currentUser.uid
            )
        }
      );

    } else {

      await updateDoc(
        myRef,
        {
          friends:
            arrayUnion(
              targetUid
            )
        }
      );


      await updateDoc(
        targetRef,
        {
          friends:
            arrayUnion(
              currentUser.uid
            )
        }
      );

    }


    await loadPeople();

  } catch (error) {

    console.error(
      "Friend update error:",
      error
    );


    alert(
      "Could not update friend list."
    );

  }

}


/* =====================================================
   SEARCH
   ===================================================== */

document
  .getElementById("searchInput")
  .addEventListener(
    "input",
    event => {

      const search =
        event.target.value
          .toLowerCase()
          .trim();


      document
        .querySelectorAll(".user")
        .forEach(user => {

          const username =
            user.dataset.username || "";


          user.style.display =
            username.includes(search)
              ? "flex"
              : "none";

        });

    }
  );


/* =====================================================
   OPEN CHAT
   ===================================================== */

function openChat(user) {

  selectedUser = user;


  emptyChat.classList.add(
    "hidden"
  );


  chatArea.classList.remove(
    "hidden"
  );


  document.getElementById(
    "chatName"
  ).textContent =
    user.username || "User";


  setAvatar(
    document.getElementById(
      "chatAvatar"
    ),
    user
  );


  messenger.classList.add(
    "chat-open"
  );


  loadMessages();

}


/* =====================================================
   CREATE UNIQUE CHAT ID
   ===================================================== */

function getChatId() {

  if (
    !currentUser ||
    !selectedUser
  ) {

    return null;

  }


  const ids = [
    currentUser.uid,
    selectedUser.uid
  ];


  ids.sort();


  return ids.join("_");

}


/* =====================================================
   REALTIME MESSAGE LISTENER
   ===================================================== */

function loadMessages() {

  if (unsubscribeMessages) {

    unsubscribeMessages();

    unsubscribeMessages = null;

  }


  messagesDiv.innerHTML = "";


  const chatId =
    getChatId();


  if (!chatId) {
    return;
  }


  const messagesRef =
    collection(
      db,
      "chats",
      chatId,
      "messages"
    );


  const messagesQuery =
    query(
      messagesRef,
      orderBy(
        "createdAt",
        "asc"
      )
    );


  unsubscribeMessages =
    onSnapshot(
      messagesQuery,
      snapshot => {

        messagesDiv.innerHTML = "";


        snapshot.forEach(
          item => {

            displayMessage(
              item.data()
            );

          }
        );


        requestAnimationFrame(() => {

          messagesDiv.scrollTop =
            messagesDiv.scrollHeight;

        });

      },
      error => {

        console.error(
          "Realtime message error:",
          error
        );

      }
    );

}


/* =====================================================
   DISPLAY MESSAGE
   ===================================================== */

function displayMessage(message) {

  const wrapper =
    document.createElement("div");


  wrapper.className =
    message.senderId ===
    currentUser.uid
      ? "message sent"
      : "message received";


  const text =
    document.createElement("div");


  text.textContent =
    message.text || "";


  wrapper.appendChild(text);


  if (message.createdAt) {

    const time =
      document.createElement("div");


    time.className =
      "message-time";


    try {

      time.textContent =
        message.createdAt
          .toDate()
          .toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit"
            }
          );

    } catch {

      time.textContent = "";

    }


    wrapper.appendChild(time);

  }


  messagesDiv.appendChild(
    wrapper
  );

}


/* =====================================================
   SEND MESSAGE
   ===================================================== */

document
  .getElementById("sendBtn")
  .addEventListener(
    "click",
    sendMessage
  );


document
  .getElementById("messageInput")
  .addEventListener(
    "keydown",
    event => {

      if (event.key === "Enter") {

        event.preventDefault();

        sendMessage();

      }

    }
  );


async function sendMessage() {

  if (
    !currentUser ||
    !selectedUser
  ) {

    return;

  }


  const input =
    document.getElementById(
      "messageInput"
    );


  const text =
    input.value.trim();


  if (!text) {
    return;
  }


  const chatId =
    getChatId();


  if (!chatId) {
    return;
  }


  try {

    await addDoc(
      collection(
        db,
        "chats",
        chatId,
        "messages"
      ),
      {
        text: text,

        senderId:
          currentUser.uid,

        receiverId:
          selectedUser.uid,

        createdAt:
          serverTimestamp()
      }
    );


    input.value = "";

    input.focus();

  } catch (error) {

    console.error(
      "Send message error:",
      error
    );


    alert(
      "Message could not be sent."
    );

  }

}


/* =====================================================
   PROFILE MODAL
   ===================================================== */

document
  .getElementById("profileButton")
  .addEventListener(
    "click",
    openProfile
  );


function openProfile() {

  if (!currentProfile) {
    return;
  }


  document.getElementById(
    "editUsername"
  ).value =
    currentProfile.username || "";


  document.getElementById(
    "editBio"
  ).value =
    currentProfile.bio || "";


  setAvatar(
    document.getElementById(
      "profilePreview"
    ),
    currentProfile
  );


  document.getElementById(
    "profileStatus"
  ).textContent = "";


  document
    .getElementById("profileModal")
    .classList.add("show");

}


/* =====================================================
   CLOSE PROFILE
   ===================================================== */

document
  .getElementById("closeProfile")
  .addEventListener(
    "click",
    closeProfile
  );


function closeProfile() {

  document
    .getElementById("profileModal")
    .classList.remove(
      "show"
    );

}


/* =====================================================
   SAVE PROFILE
   ===================================================== */

document
  .getElementById("saveProfileBtn")
  .addEventListener(
    "click",
    saveProfile
  );


async function saveProfile() {

  const username =
    document
      .getElementById(
        "editUsername"
      )
      .value
      .trim();


  const bio =
    document
      .getElementById(
        "editBio"
      )
      .value
      .trim();


  const status =
    document.getElementById(
      "profileStatus"
    );


  status.textContent = "";


  if (username.length < 3) {

    status.textContent =
      "Nickname must be at least 3 characters.";

    return;

  }


  if (username.length > 30) {

    status.textContent =
      "Nickname must be 30 characters or less.";

    return;

  }


  try {

    await updateDoc(
      doc(
        db,
        "users",
        currentUser.uid
      ),
      {
        username: username,

        usernameLower:
          username.toLowerCase(),

        bio: bio
      }
    );


    currentProfile.username =
      username;


    currentProfile.usernameLower =
      username.toLowerCase();


    currentProfile.bio =
      bio;


    updateMyProfileUI();


    setAvatar(
      document.getElementById(
        "profilePreview"
      ),
      currentProfile
    );


    status.textContent =
      "Profile saved!";


  } catch (error) {

    console.error(
      "Profile update error:",
      error
    );


    status.textContent =
      "Could not save profile.";

  }

}


/* =====================================================
   MOBILE BACK BUTTON
   ===================================================== */

document
  .getElementById("mobileBackBtn")
  .addEventListener(
    "click",
    () => {

      messenger.classList.remove(
        "chat-open"
      );


      selectedUser = null;


      if (unsubscribeMessages) {

        unsubscribeMessages();

        unsubscribeMessages = null;

      }

    }
  );


/* =====================================================
   LOGOUT
   ===================================================== */

document
  .getElementById("logoutBtn")
  .addEventListener(
    "click",
    async () => {

      stopListeners();

      await signOut(auth);

    }
  );


/* =====================================================
   STOP LISTENERS
   ===================================================== */

function stopListeners() {

  if (unsubscribeMessages) {

    unsubscribeMessages();

    unsubscribeMessages = null;

  }


  if (unsubscribeProfile) {

    unsubscribeProfile();

    unsubscribeProfile = null;

  }

}


/* =====================================================
   FIREBASE ERROR MESSAGES
   ===================================================== */

function firebaseError(code) {

  switch (code) {

    case "auth/email-already-in-use":
      return "That email is already registered.";

    case "auth/invalid-email":
      return "Please enter a valid email.";

    case "auth/weak-password":
      return "Password must be at least 6 characters.";

    case "auth/invalid-credential":
      return "Incorrect email or password.";

    case "auth/user-not-found":
      return "Account not found.";

    case "auth/wrong-password":
      return "Incorrect password.";

    case "auth/network-request-failed":
      return "Network error. Check your internet connection.";

    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";

    default:
      return "Something went wrong. Please try again.";

  }

}


