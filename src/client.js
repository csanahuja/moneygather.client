/*!
  * Monopoly.client v1.0
  */
(function($) {

    /* Global vars */
    let interval_dice_1 = null;
    let interval_dice_2 = null;
    let UID = null;

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
            case "PLAYER_LIST":
                playerListAction(data);
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
        UID = data.uid;
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

    function playerListAction(data){
        let player_ul = $('#player-list');
        let player_list = data.player_list;
        let player_dummy = $('.player-dummy');
        let players_num = $('#players-num');
        players_num.text(player_list.length);
        player_dummy.removeClass('player-dummy hide');

        let player_li = null;
        let player_icon = null;

        for (player of player_list){
            player_li = player_dummy.clone();
            player_li.removeClass('player-dummy');
            player_li.addClass('player');
            player_li.data('uid', player.uid);
            player_li.find('.player-name').text(player.name);
            player_icon = player_li.find('.player-gender')
            player_icon.removeClass('fa-ghost');
            player_icon.addClass('fa-' + player.gender);
            player_icon.css('color', player.colour);
            if (player.uid === UID)
                player_li.addClass('active-player');
            player_ul.append(player_li);
        }

        player_dummy.addClass('player-dummy');
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

    $('#prev-player').on("click", prevPlayer);
    $('#next-player').on("click", nextPlayer);

    function prevPlayer(){
        let active_player = $('.active-player');
        let last_sibling = active_player.siblings().last();
        let prev_sibling = null;

        active_player.removeClass('active-player');
        if (active_player.index() === 1)
            prev_sibling = last_sibling;
        else
            prev_sibling = active_player.prev()
        prev_sibling.addClass('active-player');
    }

    function nextPlayer(){
        let active_player = $('.active-player');
        let last_sibling = active_player.siblings().last();
        let first_sibling = active_player.siblings().first();
        let next_sibling = null;

        active_player.removeClass('active-player');
        if (active_player.index() > last_sibling.index())
            next_sibling = first_sibling.next();
        else
            next_sibling = active_player.next()
        console.log(next_sibling);
        next_sibling.addClass('active-player');
    }

    /* Test */
    $('#create-player').on("click", function(){
        $('#box-0').html('<span id="player-user" class="bg-white fa fa-4x fa-user p-2 rounded text-danger"></span>')
    })

    $('#move-player').on("click", function(){
        let position = 0
        let user = $('#player-user')
        let movement = setInterval(function(){
            position += 1
            $('#box-' + position).append(user)
        }, 1000)
    })
})(jQuery)
