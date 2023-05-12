// Define the port number for the WebSocket server
const PORT = 6565;

// Define message types for communication between the client and server
const MESSAGE_TYPES =
{
    CLIENT: {
        JOIN_WAITING_LIST: 'JOIN_WAITING_LIST', // sent by client to join the waiting list
        LEAVE_WAITING_LIST: 'LEAVE_WAITING_LIST', // sent by client to leave the waiting list
        LEAVE_ROOM: 'LEAVE_ROOM', // sent by client to leave a room
        AUTHENTICATION: 'AUTHENTICATION' // sent by client for authentication, currently only for admin auth
    },
    SERVER: {
        JOIN_ROOM_SUCCESS: 'JOIN_ROOM_SUCCESS', // sent by server to indicate successful room join
        CLIENT_LEFT: 'CLIENT_LEFT', // sent by server to indicate a client has left the room
        IMAGE_STREAM: 'IMAGE_STREAM', //! sent by server to stream image data to clients
        AUTHENTICATION_SUCCESS: 'AUTHENTICATION_SUCCESS', // sent by server to indicate successful authentication
        ADMIN_DASHBOARD: 'ADMIN_DASHBOARD', // sent by server to provide admin dashboard data
    },
    ADMIN: {
        
        GET_STATS: 'GET_STATS'
    },
    CHAT_MESSAGE: 'CHAT_MESSAGE',

};

// Define data types for messages sent between the client and server
const MESSAGE_DATA_TYPES = {
    TEXT: 'TEXT',  // data type for text messages
    IMAGE: 'IMAGE', // data type for image messages, only used by chatLogger
    STATS: 'STATS', // data type for stats messages, only used by admin dashboard
    IMAGE_STREAM_HEADER: 'IMAGE_STREAM_HEADER', // data type for header of image stream messages
    IMAGE_STREAM_CHUNK: 'IMAGE_STREAM_CHUNK', // data type for chunks of image stream messages
    IMAGE_STREAM_END: 'IMAGE_STREAM_END', // data type for end of image stream messages

};

// Define error types
const ERROR_TYPES = {
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED', // error type for rate limit exceeded errors
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR', // error type for internal server errors
    IMAGE_SIZE_LIMIT_EXCEEDED: 'IMAGE_SIZE_LIMIT_EXCEEDED' // error type for image size limit exceeded errors
};

export { MESSAGE_TYPES, MESSAGE_DATA_TYPES, ERROR_TYPES, PORT };