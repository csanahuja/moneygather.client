$(function(){

    /* WebSocket */
    let socket = new WebSocket("wss://api.niticras.com/ws");

    socket.onopen = function(event) {
        console.log("Connection established");
    };

    socket.onclose = function(event) {
        console.log("Connection closed");
    };

    socket.onerror = function(error) {
        console.warn(`Error: ${error.message}`);
    };

    socket.onmessage = function(event) {
        let data = JSON.parse(event.data)

        switch (data.action) {
            case "MESSAGE":
                chatMessageAction(data);
                break;
            default:
                console.warn(`Unknown action: ${data.action}`)
        }
    };

    /* Socket Message Handlers */
    function chatMessageAction(data){
        let chatWindow = $("#chat-window");
        let textMessage = data.message.replace(/(?:\n)/g,'<br>');
        let message = `<p><strong>${data.from}</strong>: ${textMessage}</p>`;
        chatWindow.append(message);
        chatWindow.scrollTop(chatWindow.prop("scrollHeight"));
    }

    /* Event Handlers */
    $("#chat-submit").on("click", sendMessage)
    $("#chat-message").on("keypress", function (event) {
        if (event.which == 13 && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    function sendMessage(){
        let chatMessage = $("#chat-message");
        let message = chatMessage.val();
        chatMessage.val('');

        if (message.length === 0)
            return

        let socketMessage = {
            "action": "MESSAGE",
            "message": message,
        }
        socket.send(JSON.stringify(socketMessage));
    }

});

