/*
  For node server use https://github.com/TannerGabriel/WebRTC-Video-Broadcast
  - run node server
  - open http://localhost:3000/watch.html

  To deploy node.js project on Heroku watch this youtube video https://www.youtube.com/watch?v=MxfxiR8TVNU

  General Flow:
  - socket on connection
  - socket emit broadcaster
  - socket on watcher
    + RTCPeerConnection
    + addStream
    + createOffer
    + setLocalDescription then emit answer
    + onicecandidate then emit candidate
  - socket on answer
  - socket on candidate
  - socket on disconnectPeer
  */

 import React, {useState} from 'react';
 import {StyleSheet, Dimensions, View, Button} from 'react-native';
 import {RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, mediaDevices, RTCView} from 'react-native-webrtc';
 import io from 'socket.io-client';
 
 const screenWidth = Dimensions.get('window').width;
 const screenHeight = Dimensions.get('window').height;
 
 export default WebRTCBroadcast = _ => {  
   let socket, peer;
   let clients = {};
 
   const config = {
     iceServers: [
       {urls: 'stun:stun.services.mozilla.com'},
       {urls: 'stun:stun.l.google.com:19302'}
     ]
   };
   const [localStream, setLocalStream] = useState();
 
   const broadcast = async _ => {
     const stream = await mediaDevices.getUserMedia({
       audio: true,
       video: true
     }); 
     
     socket = io('http://192.168.xxx.xxx:3000'); 
     socket
       .on('connect', _ => socket.emit('broadcaster'))
       .on('watcher', id => {
         peer = new RTCPeerConnection(config);
         clients[id] = peer;
         peer; 
         peer
           .addStream(stream)
           .createOffer()
           .then(sdp => peer.setLocalDescription(sdp))
           .then(_ => socket.emit('offer', id, peer.localDescription));
         peer.onicecandidate = e => e.candidate && socket.emit('candidate', id, e.candidate); 
       })
       .on('answer', (id, desc) => clients[id].setRemoteDescription(new RTCSessionDescription(desc)))
       .on('candidate', (id, candidate) => clients[id].addIceCandidate(new RTCIceCandidate(candidate)))
       .on('disconnectPeer', id => {
         const client = clients[id];
 
         if(client) {
           clients[id].close();
           delete clients[id];
         }
       });
 
     setLocalStream(stream);
   };
 
   return (
     <View style={{flex: 1}}>
       {localStream && <RTCView 
         streamURL={localStream.toURL()}
         zIndex={0} 
         objectFit={'cover'} 
         style={styles.fullScreen}
       /> || <Button title="Broadcast Now" onPress={_ => broadcast()} />} 
     </View> 
   );
 }
  
 const styles = StyleSheet.create({
   fullScreen: {
     position: 'absolute',
     top: 0,
     left: 0,
     width: screenWidth, 
     height: screenHeight 
   }
 });