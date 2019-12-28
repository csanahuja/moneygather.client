$(function(){

    /* Board construction */
    resizeBoard();

    function resizeBoard(){
        let innerBoard = $("#inner-board");
        let size = innerBoard.height()
        innerBoard.css("height", size)
        innerBoard.css("width", size);
    }

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
            case "PLAYER_CONNECTED":
                playerConnectedAction(data);
                break;
            case "PLAYER_DISCONNECTED":
                playerDisconnectedAction(data);
                break;
            case "PLAYER_UPDATED":
                playerUpdatedAction(data);
                break;
            case "PLAYER_INFO":
                playerInfoAction(data);
                break;
            default:
                console.warn(`Unknown action: ${data.action}`)
        }
    };

    /* Socket Message Handlers */
    function chatMessageAction(data){
        let textMessage = data.message.replace(/(?:\n)/g,'<br>');
        let message = `<p>
            <span class="fa fa-${data.gender} mr-2" style="color: ${data.colour}"></span>
            <strong style="color: ${data.colour}">${data.name}</strong>:
            ${textMessage}
        </p>`;
        addChatMessage(message);
    }

    function playerConnectedAction(data){
        let chatWindow = $("#chat-window");
        let message = `<p>
            <span class="fa fa-${data.gender} mr-2" style="color: ${data.colour}"></span>
            <strong style="color: ${data.colour}">${data.name}</strong> connected
        </p>`;
        addChatMessage(message);
    }

    function playerDisconnectedAction(data){
        let chatWindow = $("#chat-window");
        let message = `<p>
            <span class="fa fa-${data.gender} mr-2" style="color: ${data.colour}"></span>
            <strong style="color: ${data.colour}">${data.name}</strong> disconnected
        </p>`;
        addChatMessage(message);
    }

    function playerUpdatedAction(data){
        let chatWindow = $("#chat-window");
        let message = `<p>
            <span class="fa fa-${data.previous.gender} mr-2" style="color: ${data.previous.colour}"></span>
            <strong style="color: ${data.previous.colour}">${data.previous.name}</strong>
            is now 
            <span class="fa fa-${data.current.gender} mx-2" style="color: ${data.current.colour}"></span>
            <strong style="color: ${data.current.colour}">${data.current.name}</strong>
        </p>`;
        addChatMessage(message);
    }

    function playerInfoAction(data){
        updatePlayerPreview(data.name, data.colour, data.gender)
    }

    function addChatMessage(message){
        let chatWindow = $("#chat-window");
        chatWindow.append(message);
        chatWindow.scrollTop(chatWindow.prop("scrollHeight"));
    }

    /* Event Handlers */
    $("#chat-submit").on("click", sendChatMessage)
    $("#chat-message").on("keypress", function (event) {
        if (event.which == 13 && !event.shiftKey) {
            event.preventDefault();
            sendChatMessage();
        }
    });

    function sendChatMessage(){
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

    $("#update-player").on("click", updatePlayer)

    function updatePlayerPreview(name, colour, gender){
        let player = $('#player');
        let player_name = $('#player-name-display');

        if (name.length > 0)
            player_name.text(name);
        
        player.removeClass('text-primary');
        player.removeClass(function (index, className) {
            return (className.match (/\bfa-\S+/g) || []).join(' ');
        });

        player.addClass('fa-10x fa-' + gender);
        player.css('color', colour);
    }

    function updatePlayer(){
        let name = $('#player-name').val();
        let colour = $('#player-colour').val();
        let gender = $('#player-gender').val();

        updatePlayerPreview(name, colour, gender);

        let socketMessage = {
            "action": "UPDATE_PLAYER",
            "name": name,
            "colour": colour,
            "gender": gender,
        }
        socket.send(JSON.stringify(socketMessage));
    }

});

