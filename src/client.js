$(function(){

    /* Global vars */
    let interval_dice_1 = null;
    let interval_dice_2 = null;

    /* Board construction */
    resizeBoard();

    function resizeBoard(){
        let innerBoard = $("#inner-board");
        let size = innerBoard.height();
        innerBoard.css("height", size);
        innerBoard.css("width", size);
    }

    /* WebSocket */
    let socket = new WebSocket("wss://api.niticras.com/ws");

    socket.onclose = function(event) {
        console.log(event);
        $('#modal').modal({backdrop: 'static', keyboard: false});
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
            case "PLAYER_STATUS":
                playerStatusAction(data);
                break;
            case "PLAYER_INFO":
                playerInfoAction(data);
                break;
            case "DICES_RESULT":
                dicesResultAction(data);
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
        let message = `<p>
            <span class="fa fa-${data.gender} mr-2" style="color: ${data.colour}"></span>
            <strong style="color: ${data.colour}">${data.name}</strong> connected
        </p>`;
        addGameEventMessage(message);
    }

    function playerDisconnectedAction(data){
        let message = `<p>
            <span class="fa fa-${data.gender} mr-2" style="color: ${data.colour}"></span>
            <strong style="color: ${data.colour}">${data.name}</strong> disconnected
        </p>`;
        addGameEventMessage(message);
    }

    function playerUpdatedAction(data){
        let message = `<p>
            <span class="fa fa-${data.previous.gender} mr-2" style="color: ${data.previous.colour}"></span>
            <strong style="color: ${data.previous.colour}">${data.previous.name}</strong>
            is now 
            <span class="fa fa-${data.current.gender} mx-2" style="color: ${data.current.colour}"></span>
            <strong style="color: ${data.current.colour}">${data.current.name}</strong>
        </p>`;
        addGameEventMessage(message);
    }

    function playerStatusAction(data){
        let status = data.status === 'ready' ? 'is now ready' : 'is not ready'
        let message = `<p>
            <span class="fa fa-${data.gender} mr-2" style="color: ${data.colour}"></span>
            <strong style="color: ${data.colour}">${data.name}</strong> ${status}
        </p>`;
        addGameEventMessage(message);
    }

    function playerInfoAction(data){
        updatePlayerPreview(data.name, data.colour, data.gender)
    }

    function addChatMessage(message){
        let chatWindow = $("#chat-window");
        chatWindow.append(message);
        chatWindow.scrollTop(chatWindow.prop("scrollHeight"));
    }

    function addGameEventMessage(message){
        let gameEventsWindow = $("#game-events-window");
        gameEventsWindow.append(message);
        gameEventsWindow.scrollTop(gameEventsWindow.prop("scrollHeight"));
    }

    function dicesResultAction(data){
        let dice_1 = $('#dice-1');
        let dice_2 = $('#dice-2');

        setTimeout(function(){

            clearInterval(interval_dice_1);
            clearInterval(interval_dice_2);

            setDiceNumber(dice_1, data.dice1)
            setDiceNumber(dice_2, data.dice2)

            $('#throw-dices').prop('disabled', false)
        }, 1000)
    }

    function setDiceNumber(dice, number){
        dice.removeClass(function (index, className) {
            return (className.match (/\bfa-dice\S+/g) || []).join(' ');
        });
        dice.data('dice', number)
        dice.addClass('fa-dice-' + number);
    }

    /* Event Handlers */
    $('#check-server-status').on("click", checkServerStatus);
    $('#reload-webpage').on("click", reloadWebpage);

    function checkServerStatus(){
        let serverStatus = $('#server-status');
        $.ajax({
            url: "https://api.niticras.com",
        }).done(function(data) {
            serverStatus.html(`<p>Server status: <strong>Online</strong> <span class="fa fa-check text-success"></span>`)
        }).fail(function(data) {
            serverStatus.html(`<p>Server status: <strong>Offline</strong> <span class="fa fa-times text-danger"></span>`)
        });
    }

    function reloadWebpage(){
        location.reload();
    }

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
            "action": "PLAYER_UPDATED",
            "name": name,
            "colour": colour,
            "gender": gender,
        }
        socket.send(JSON.stringify(socketMessage));
    }

    $('#throw-dices').on("click", throwDices)

    function throwDices(){
        $(this).attr("disabled", true);
        let dice_1 = $('#dice-1');
        let dice_2 = $('#dice-2');

        interval_dice_1 = setInterval(changeDice.bind(null, dice_1), 50);
        interval_dice_2 = setInterval(changeDice.bind(null, dice_2), 50);

        let socketMessage = {
            "action": "THROW_DICES",
        }
        socket.send(JSON.stringify(socketMessage));
    }

    function changeDice(dice){
        let current_dice = dice.data('dice');
        switch (current_dice) {
            case "one":
                dice.data('dice', 'two');
                dice.removeClass('fa-dice-one');
                dice.addClass('fa-dice-two');
                break;
            case "two":
                dice.data('dice', 'three');
                dice.removeClass('fa-dice-two');
                dice.addClass('fa-dice-three');
                break;
            case "three":
                dice.data('dice', 'four');
                dice.removeClass('fa-dice-three');
                dice.addClass('fa-dice-four');
                break;
            case "four":
                dice.data('dice', 'five');
                dice.removeClass('fa-dice-four');
                dice.addClass('fa-dice-five');
                break;
            case "five":
                dice.data('dice', 'six');
                dice.removeClass('fa-dice-five');
                dice.addClass('fa-dice-six');
                break;
            case "six":
                dice.data('dice', 'one');
                dice.removeClass('fa-dice-six');
                dice.addClass('fa-dice-one');
                break;
            default:
                dice.data('dice', 'one');
                dice.removeClass('fa-dice');
                dice.addClass('fa-dice-one');
        }
    }

    $('#rotate-board').on("click", rotateBoard)

    function rotateBoard(){
        let innerBoard = $('#inner-board');
        let innerCenterBoard = $('#inner-center-board');
        let rotate = innerBoard.data('rotate');
        switch (rotate) {
            case 90:
                innerBoard.data('rotate', 180);
                innerBoard.removeClass('rotate-90');
                innerBoard.addClass('rotate-180');
                innerCenterBoard.removeClass('rotate-270');
                innerCenterBoard.addClass('rotate-180');
                break;
            case 180:
                innerBoard.data('rotate', 270);
                innerBoard.removeClass('rotate-180');
                innerBoard.addClass('rotate-270');
                innerCenterBoard.removeClass('rotate-180');
                innerCenterBoard.addClass('rotate-90');
                break;
            case 270:
                innerBoard.data('rotate', 0);
                innerBoard.removeClass('rotate-270');
                innerCenterBoard.removeClass('rotate-90');
                break;
            default:
                innerBoard.data('rotate', 90);
                innerBoard.addClass('rotate-90');
                innerCenterBoard.addClass('rotate-270');
        }
    }

    $('#player-not-ready').on("click", setReady);
    $('#player-ready').on("click", setNotReady);

    function setReady(){
        $(this).addClass('hide');
        $('#player-ready').removeClass('hide');
        $('#update-player').prop('disabled', true);
        $('#player').removeClass('rotate-y');

        let socketMessage = {
            "action": "PLAYER_STATUS",
            "status": "ready",
        }
        socket.send(JSON.stringify(socketMessage));
    }

    function setNotReady(){
        $(this).addClass('hide');
        $('#player-not-ready').removeClass('hide');
        $('#update-player').prop('disabled', false);
        $('#player').addClass('rotate-y');

        let socketMessage = {
            "action": "PLAYER_STATUS",
            "status": "not_ready",
        }
        socket.send(JSON.stringify(socketMessage));
    }

});

