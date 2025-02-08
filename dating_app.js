import React, { useState, useEffect, useRef } from "react";
import { View, Text, Alert, StyleSheet, Image, FlatList, TouchableOpacity, TextInput, Button } from "react-native";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import messaging from "@react-native-firebase/messaging";
import notifee from "@notifee/react-native";
import Swiper from "react-native-deck-swiper";
import InCallManager from "react-native-incall-manager";
import { RTCPeerConnection, RTCView, mediaDevices } from "react-native-webrtc";
import * as ImagePicker from "react-native-image-picker";
import storage from "@react-native-firebase/storage";
import SoundRecorder from "react-native-sound-recorder";

const DatingApp = () => {
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [likedProfiles, setLikedProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [messageSuggestions, setMessageSuggestions] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isCalling, setIsCalling] = useState(false);
  const [stories, setStories] = useState([]);
  const [recording, setRecording] = useState(false);
  const [matchedUsers, setMatchedUsers] = useState([]);
  const peerConnection = useRef(new RTCPeerConnection());
  const swiperRef = useRef(null);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        fetchPotentialMatches();
        listenForLikedProfiles();
        fetchStories();
        fetchMatchedUsers();
        requestNotificationPermission();
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchMatchedUsers = async () => {
    if (!user) return;
    const snapshot = await firestore()
      .collection("matches")
      .where("user1", "==", user.uid)
      .get();
    const matches = snapshot.docs.map(doc => doc.data().user2);
    setMatchedUsers(matches);
  };

  const deleteMatch = async (matchId) => {
    await firestore()
      .collection("matches")
      .where("user1", "==", user.uid)
      .where("user2", "==", matchId)
      .get()
      .then(snapshot => {
        snapshot.forEach(doc => doc.ref.delete());
      });
    fetchMatchedUsers();
    Alert.alert("Eşleşme silindi", "Bu kullanıcıyla artık eşleşmeniz yok.");
  };

  const reportUser = async (reportedUserId) => {
    await firestore().collection("reports").add({
      reportedUserId: reportedUserId,
      timestamp: firestore.FieldValue.serverTimestamp(),
    });
    Alert.alert("Şikayet Gönderildi", "Bu kullanıcı yönetim ekibine bildirildi.");
  };

  const sendMessage = async (receiverId, message) => {
    if (!matchedUsers.includes(receiverId)) {
      Alert.alert("Hata", "Sadece eşleştiğiniz kişilerle mesajlaşabilirsiniz!");
      return;
    }
    await firestore().collection("messages").add({
      senderId: user.uid,
      receiverId,
      message,
      timestamp: firestore.FieldValue.serverTimestamp(),
    });
  };

  const generateMessageSuggestions = (profile) => {
    return [
      `Merhaba ${profile.name}, ortak ilgi alanlarımız hakkında konuşmak ister misin?`,
      `Selam ${profile.name}, ${profile.interests?.[0]} hakkında ne düşünüyorsun?`,
      `Hey ${profile.name}, ilgi alanlarımız çok benziyor! En sevdiğin şey ne?`,
      `Merhaba ${profile.name}, bugün nasılsın? :)`,
    ];
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={stories}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.storyCard}>
            <Image source={{ uri: item.imageUrl }} style={styles.storyImage} />
            <Text>{item.userName}</Text>
            <Text>Beğeni: {item.likes} | Görüntüleme: {item.views}</Text>
            <Button title="Beğen" onPress={() => likeStory(item.id)} />
          </View>
        )}
      />
      <FlatList
        data={matchedUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View>
            <Text>{item.name}</Text>
            <Button title="Eşleşmeyi Sil" onPress={() => deleteMatch(item.id)} />
          </View>
        )}
      />
      <TextInput
        placeholder="Mesajınızı yazın..."
        value={newMessage}
        onChangeText={setNewMessage}
      />
      <Button title="Mesaj Gönder" onPress={() => sendMessage("receiverId", newMessage)} />
      <Button title="Sesli Mesaj Kaydet" onPress={recording ? stopRecording : startRecording} />
      <Button title="Kullanıcıyı Şikayet Et" onPress={() => reportUser("exampleUserId")} />
    </View>
  );
};

export default DatingApp;
