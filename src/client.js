/*!
  * moneygather.client v1.0
  */
(function ($) {
    /********************************************
     * Globals vars and initialization
     *******************************************/

    const socket = new WebSocket('wss://api.niticras.com/ws')
    let UID = null
    let dicesTurnInterval = null

    resizeBoard()

    /********************************************
     * Resize functions
     *******************************************/

    function resizeBoard () {
        const innerBoard = $('#inner-board')
        const size = innerBoard.height()
        innerBoard.css('height', size)
        innerBoard.css('width', size)
    }

    /********************************************
     * Socket events
     *******************************************/

    socket.onclose = function (event) {
        const code = event.code
        switch (code) {
        case 3000:
            createGameAlreadyStartedModal()
            break
        case 3001:
            createMaxPlayersReachedModal()
            break
        default:
            createDisconnectedModal()
        }
        $('#modal').modal({ backdrop: 'static', keyboard: false })
    }

    socket.onmessage = function (event) {
        const data = JSON.parse(event.data)
        const action = data.action

        switch (action) {
        case 'MESSAGE':
            chatMessageAction(data)
            break
        case 'GAME_EVENT':
            gameEventAction(data)
            break
        case 'PLAYER_INFO':
            playerInfoAction(data)
            break
        case 'PLAYER_LIST':
            playerListAction(data)
            break
        case 'GAME_STARTED':
            gameStartedAction(data)
            break
        case 'PLAYER_TURN':
            playerTurnAction(data)
            break
        case 'PLAYER_END_DICES':
            playerEndDicesAction(data)
            break
        case 'PLAYER_MOVEMENT':
            playerMovementAction(data)
            break
        case 'DICES_RESULT':
            dicesResultAction(data)
            break
        default:
            console.warn(`Unknown action: ${action}`)
        }
    }

    /********************************************
     * Modal functions
     *******************************************/

    function createDisconnectedModal () {
        const modalHeader = `
            <h4 class="modal-title">
                No Connection <span class="fa fa-plug"></span>
            </h4>
        `
        const modalBody = `
            <p>
                There is no connection with the server. May be because one 
                of these conditions
            </p>
            <ul>
                <li>
                    <span class="fa fa-server"></span>
                    <strong>Server offline</strong>
                    <span>: The server is down</li>
                <li>
                    <span class="fa fa-network-wired"></span>
                    <strong>No internet</strong>
                    <span>: You internet is down</span>
                </li>
            </ul>
            <p>
                Verify your internet connection is working, if so check 
                server status and if it is online reload the webpage.
            </p>
            <button id="check-server-status" type="button" class="btn btn-primary">
                Check server status <span class="fa fa-database ml-2"></span>
            </button>
            <p id="server-status" class="mt-3"></p>
        `
        const modalFooter = `
            <button id="reload-webpage" type="button" class="btn btn-primary">
                Reload <span class="fa fa-refresh ml-2"></span>
            </button>
        `
        createModal(modalHeader, modalBody, modalFooter)
    }

    function createGameAlreadyStartedModal () {
        const modalHeader = `
            <h4 class="modal-title">
                Game already started <span class="fa fa-sad-cry"></span>
            </h4>
        `
        const modalBody = `
            <p>
                The game has already started. You must wait untill the game
                ends.
            </p>
        `
        createModal(modalHeader, modalBody, null)
    }

    function createMaxPlayersReachedModal () {
        const modalHeader = `
            <h4 class="modal-title">
                Game is full <span class="fa fa-sad-cry"></span>
            </h4>
        `
        const modalBody = `
            <p>
                The game has already reached max players.
            </p>
        `
        createModal(modalHeader, modalBody, null)
    }

    function createModal (header, body, footer) {
        const closeButton = `
            <button type="button" class="close" data-dismiss="modal" 
                aria-label="Close">
                <span class="fa fa-times"></span>
            </button>
        `
        $('.modal-header').html(header + closeButton)
        $('.modal-body').html(body)
        $('.modal-footer').html(footer)
    }

    /********************************************
     * Utils functions
     *******************************************/

    function createPlayerIdentifierMessage (name, colour, gender) {
        const playerIdentifier = `
           <span class="fa fa-${gender}" style="color: ${colour}"></span>
            <strong style="color: ${colour}">${name}</strong>
        `
        return playerIdentifier
    }

    function updatePlayerPreview (name, colour, gender) {
        const player = $('#player')
        const playerName = $('#player-name-display')

        if (name.length > 0) { playerName.text(name) }

        player.removeClass(function (index, className) {
            return (className.match(/\bfa-\S+/g) || []).join(' ')
        })

        player.addClass('fa-10x fa-' + gender)
        player.css('color', colour)
    }

    function setDiceNumber (dice, number) {
        dice.removeClass(function (index, className) {
            return (className.match(/\bfa-dice\S+/g) || []).join(' ')
        })
        dice.data('dice', number)
        dice.addClass('fa-dice-' + number)
    }

    function changeDice (dice) {
        const currentDice = dice.data('dice')
        switch (currentDice) {
        case 'one':
            dice.data('dice', 'two')
            dice.removeClass('fa-dice-one')
            dice.addClass('fa-dice-two')
            break
        case 'two':
            dice.data('dice', 'three')
            dice.removeClass('fa-dice-two')
            dice.addClass('fa-dice-three')
            break
        case 'three':
            dice.data('dice', 'four')
            dice.removeClass('fa-dice-three')
            dice.addClass('fa-dice-four')
            break
        case 'four':
            dice.data('dice', 'five')
            dice.removeClass('fa-dice-four')
            dice.addClass('fa-dice-five')
            break
        case 'five':
            dice.data('dice', 'six')
            dice.removeClass('fa-dice-five')
            dice.addClass('fa-dice-six')
            break
        case 'six':
            dice.data('dice', 'one')
            dice.removeClass('fa-dice-six')
            dice.addClass('fa-dice-one')
            break
        default:
            dice.data('dice', 'one')
            dice.removeClass('fa-dice')
            dice.addClass('fa-dice-one')
        }
    }

    function constructPlayerSlider (playerList, numPlayers) {
        const playerSliderElem = $('#player-slider')
        const playerListElem = $('#player-slider-list')
        const bulletsElem = $('#player-slider-bullets')
        const playerDummy = $('.player-dummy')
        const bulletDummy = $('.bullet-dummy')
        const playersNum = $('#players-num')

        $('.player').remove()
        $('.bullet').remove()

        playersNum.text(playerList.length + '/' + numPlayers)
        playerSliderElem.data('items', playerList.length)
        playerDummy.removeClass('player-dummy')
        bulletDummy.removeClass('bullet-dummy')

        playerList.forEach((player, index) => {
            constructPlayerSlide(
                player, index, playerListElem, bulletsElem,
                playerDummy, bulletDummy)
        })

        playerDummy.addClass('player-dummy')
        bulletDummy.addClass('bullet-dummy')
    }

    function constructPlayerSlide (
        player, index, playerListElem, bulletsElem, playerDummy,
        bulletDummy) {
        const playerElem = playerDummy.clone()
        const bullet = bulletDummy.clone()
        const playerIconElem = playerElem.find('.player-gender')

        playerElem.removeClass('player-dummy')
        playerElem.addClass('player')
        playerElem.data('uid', player.uid)
        playerElem.data('index', index)
        playerElem.find('.player-name').text(player.name)

        playerIconElem.removeClass('fa-ghost')
        playerIconElem.addClass('fa-' + player.gender)
        playerIconElem.css('color', player.colour)

        bullet.addClass('bullet')
        bullet.data('index', index)

        if (player.uid === UID) {
            playerElem.addClass('active-player')
            bullet.removeClass('fa-circle-o')
            bullet.addClass('active-bullet fa-circle')
        }
        playerListElem.append(playerElem)
        bulletsElem.append(bullet)
    }

    function constructPlayerList (playerList, numPlayers) {
        const playersReadyNum = $('#players-ready-num')
        const playerListElem = $('#players-ready-list')
        let playersReady = 0

        playerListElem.empty()

        playerList.forEach((player, index) => {
            let statusIconClasses = 'fa fa-times p-1 rounded bg-danger'
            if (player.ready) {
                playersReady += 1
                statusIconClasses = 'fa fa-check p-1 rounded bg-success'
            }

            const status = `<span 
                    class="status-icon text-center text-white mr-2 
                    ${statusIconClasses}">
                </span>
            `
            const playerIdentifier = createPlayerIdentifierMessage(
                player.name,
                player.colour,
                player.gender
            )
            const playerElem = `<li class="d-inline-block w-100 mb-2">
                ${status}
                ${playerIdentifier}
            </li>`
            playerListElem.append(playerElem)
        })

        playersReadyNum.text(playersReady + '/' + numPlayers)
    }

    function setPlayerSlide (index) {
        const activePlayer = $('.active-player')
        const activeBullet = $('.active-bullet')
        const playerSlides = $('.player')
        const playerBullets = $('.bullet')

        activePlayer.removeClass('active-player')
        activeBullet.removeClass('active-bullet fa-circle')
        activeBullet.addClass('fa-circle-o')

        playerSlides.each(function () {
            const player = $(this)
            if (player.data('index') === index) {
                player.addClass('active-player')
            }
        })

        playerBullets.each(function () {
            const bullet = $(this)
            if (bullet.data('index') === index) {
                bullet.addClass('fa-circle active-bullet')
                bullet.removeClass('fa-circle-o')
            }
        })
    }

    function createPlayerChip (gender, colour, uid) {
        const chip = `
            <div class="player-chip bg-white rounded"
                data-uid=${uid} data-position="0">
                <span class="fa fa-${gender}" style="color: ${colour}"></span>
            </div>
        `
        return chip
    }

    function createBoardPlayers (players) {
        const initialBoardPos = $('#box-0')
        players.forEach(player => {
            const icon = createPlayerChip(
                player.gender, player.colour, player.uid)
            initialBoardPos.append(icon)
        })
    }

    function selectPlayerChip (uid) {
        let player = null
        $('.player-chip').each(function () {
            if ($(this).data('uid') === uid) {
                player = $(this)
            }
        })
        return player
    }

    function movePlayerChip (uid, position) {
        const player = selectPlayerChip(uid)
        let currentPosition = player.data('position')

        const moveInterval = setInterval(function () {
            currentPosition += 1
            $('#box-' + currentPosition).append(player)
            if (currentPosition === position) {
                clearInterval(moveInterval)
            }
        }, 500)

        player.data('position', position)
    }

    /********************************************
     * Game Events functions
     *******************************************/

    function playerConnectedMessage (data) {
        const playerIdentifier = createPlayerIdentifierMessage(
            data.name,
            data.colour,
            data.gender
        )
        const message = `<p>${playerIdentifier} connected</p>`
        addGameEventMessage(message)
    }

    function playerDisconnectedMessage (data) {
        const playerIdentifier = createPlayerIdentifierMessage(
            data.name,
            data.colour,
            data.gender
        )
        const message = `<p>${playerIdentifier} disconnected</p>`
        addGameEventMessage(message)
    }

    function playerReadyMessage (data) {
        const playerIdentifier = createPlayerIdentifierMessage(
            data.name,
            data.colour,
            data.gender
        )
        const message = `<p>${playerIdentifier} is now ready</p>`
        addGameEventMessage(message)
    }

    function playerNotReadyMessage (data) {
        const playerIdentifier = createPlayerIdentifierMessage(
            data.name,
            data.colour,
            data.gender
        )
        const message = `<p>${playerIdentifier} is not ready</p>`
        addGameEventMessage(message)
    }

    function playerUpdatedMessage (data) {
        const previousPlayerIdentifier = createPlayerIdentifierMessage(
            data.previous_name,
            data.previous_colour,
            data.previous_gender
        )
        const playerIdentifier = createPlayerIdentifierMessage(
            data.name,
            data.colour,
            data.gender
        )
        const message = `<p>${previousPlayerIdentifier} is now ${playerIdentifier}</p>`
        addGameEventMessage(message)
    }

    function addGameEventMessage (message) {
        const gameEventsWindow = $('#game-events-window')
        gameEventsWindow.append(message)
        gameEventsWindow.scrollTop(gameEventsWindow.prop('scrollHeight'))
    }

    /********************************************
     * Socket message handlers
     *******************************************/

    function chatMessageAction (data) {
        const textMessage = data.message.replace(/(?:\n)/g, '<br>')
        const message = `<p>
            <span class="fa fa-${data.gender} mr-2" style="color: ${data.colour}"></span>
            <strong style="color: ${data.colour}">${data.name}</strong>:
            ${textMessage}
        </p>`
        addChatMessage(message)
    }

    function addChatMessage (message) {
        const chatWindow = $('#chat-window')
        chatWindow.append(message)
        chatWindow.scrollTop(chatWindow.prop('scrollHeight'))
    }

    function gameEventAction (data) {
        const gameEvent = data.game_event

        switch (gameEvent) {
        case 'PLAYER_CONNECTED':
            playerConnectedMessage(data.data)
            break
        case 'PLAYER_DISCONNECTED':
            playerDisconnectedMessage(data.data)
            break
        case 'PLAYER_READY':
            playerReadyMessage(data.data)
            break
        case 'PLAYER_NOT_READY':
            playerNotReadyMessage(data.data)
            break
        case 'PLAYER_UPDATED':
            playerUpdatedMessage(data.data)
            break
        default:
            console.warn(`Unknown game event: ${gameEvent}`)
        }
    }

    function playerInfoAction (data) {
        UID = data.uid
        updatePlayerPreview(data.name, data.colour, data.gender)
    }

    function playerListAction (data) {
        const playerList = data.player_list
        const numPlayers = data.num_players
        constructPlayerSlider(playerList, numPlayers)
        constructPlayerList(playerList, numPlayers)
    }

    function gameStartedAction (data) {
        const gameStatusTitle = $('#game-status-title')
        gameStatusTitle.removeClass('text-danger')
        gameStatusTitle.addClass('text-success')
        gameStatusTitle.text('Game started')

        $('#dices-throw').removeClass('hide')
        $('#player-selection').addClass('hide')
        $('#players-ready').addClass('hide')

        createBoardPlayers(data.player_list)
    }

    function playerTurnAction (data) {
        dicesTurnInterval = setInterval(function () {
            const dicesPreview = $('#dices-preview')
            const dices = $('.dice')
            const dicesTurn = dicesPreview.data('dices-turn')
            if (dicesTurn) {
                dicesPreview.removeClass('bg-light')
                dices.css('transform', 'scale(1.1)')
                dicesPreview.data('dices-turn', 0)
            } else {
                dicesPreview.addClass('bg-light')
                dices.css('transform', 'scale(1)')
                dicesPreview.data('dices-turn', 1)
            }
        }, 500)
        $('#throw-dices').prop('disabled', false)
    }

    function playerEndDicesAction (data) {
        $('#throw-dices').attr('disabled', true)
        clearInterval(dicesTurnInterval)
    }

    function playerMovementAction (data) {
        const position = data.position
        const uid = data.uid
        movePlayerChip(uid, position)
    }

    function dicesResultAction (data) {
        const dice1 = $('#dice-1')
        const dice2 = $('#dice-2')

        const intervalDice1 = setInterval(changeDice.bind(null, dice1), 50)
        const intervalDice2 = setInterval(changeDice.bind(null, dice2), 50)

        setTimeout(function () {
            clearInterval(intervalDice1)
            clearInterval(intervalDice2)

            setDiceNumber(dice1, data.dice1)
            setDiceNumber(dice2, data.dice2)
        }, 1000)
    }

    /********************************************
     * Event handlers
     *******************************************/

    $('body').on('click', '#check-server-status', checkServerStatus)
    $('body').on('click', '#reload-webpage', reloadWebpage)
    $('#chat-submit').on('click', sendChatMessage)
    $('#chat-message').on('keypress', checkSendChatMessage)
    $('#update-player').on('click', updatePlayer)
    $('#throw-dices').on('click', throwDices)
    $('#rotate-board').on('click', rotateBoard)
    $('#player-not-ready').on('click', setReady)
    $('#player-ready').on('click', setNotReady)
    $('#prev-player').on('click', prevPlayer)
    $('#next-player').on('click', nextPlayer)
    $('body').on('click', '.bullet', bulletSlide)

    function checkServerStatus () {
        const serverStatus = $('#server-status')
        $.ajax({
            url: 'https://api.niticras.com'
        }).done(function (data) {
            serverStatus.html('<p>Server status: <strong>Online</strong> <span class="fa fa-check text-success"></span>')
        }).fail(function (data) {
            serverStatus.html('<p>Server status: <strong>Offline</strong> <span class="fa fa-times text-danger"></span>')
        })
    }

    function reloadWebpage () {
        location.reload()
    }

    function checkSendChatMessage (event) {
        if (event.which === 13 && !event.shiftKey) {
            event.preventDefault()
            sendChatMessage()
        }
    }

    function sendChatMessage () {
        const chatMessage = $('#chat-message')
        const message = chatMessage.val()
        chatMessage.val('')

        if (message.length === 0) { return }

        const socketMessage = {
            action: 'MESSAGE',
            message: message
        }
        socket.send(JSON.stringify(socketMessage))
    }

    function updatePlayer () {
        const name = $('#player-name').val()
        const colour = $('#player-colour').val()
        const gender = $('#player-gender').val()

        updatePlayerPreview(name, colour, gender)

        const socketMessage = {
            action: 'PLAYER_UPDATED',
            name: name,
            colour: colour,
            gender: gender
        }
        socket.send(JSON.stringify(socketMessage))
    }

    function throwDices () {
        $(this).attr('disabled', true)
        clearInterval(dicesTurnInterval)

        const socketMessage = {
            action: 'THROW_DICES'
        }
        socket.send(JSON.stringify(socketMessage))
    }

    function rotateBoard () {
        const innerBoard = $('#inner-board')
        const innerCenterBoard = $('#inner-center-board')
        const rotate = innerBoard.data('rotate')
        switch (rotate) {
        case 90:
            innerBoard.data('rotate', 180)
            innerBoard.removeClass('rotate-90')
            innerBoard.addClass('rotate-180')
            innerCenterBoard.removeClass('rotate-270')
            innerCenterBoard.addClass('rotate-180')
            break
        case 180:
            innerBoard.data('rotate', 270)
            innerBoard.removeClass('rotate-180')
            innerBoard.addClass('rotate-270')
            innerCenterBoard.removeClass('rotate-180')
            innerCenterBoard.addClass('rotate-90')
            break
        case 270:
            innerBoard.data('rotate', 0)
            innerBoard.removeClass('rotate-270')
            innerCenterBoard.removeClass('rotate-90')
            break
        default:
            innerBoard.data('rotate', 90)
            innerBoard.addClass('rotate-90')
            innerCenterBoard.addClass('rotate-270')
        }
    }

    function setReady () {
        $(this).addClass('hide')
        $('#player-ready').removeClass('hide')
        $('#update-player').prop('disabled', true)
        $('#player').removeClass('rotate-y')

        const socketMessage = {
            action: 'PLAYER_STATUS',
            status: 'ready'
        }
        socket.send(JSON.stringify(socketMessage))
    }

    function setNotReady () {
        $(this).addClass('hide')
        $('#player-not-ready').removeClass('hide')
        $('#update-player').prop('disabled', false)
        $('#player').addClass('rotate-y')

        const socketMessage = {
            action: 'PLAYER_STATUS',
            status: 'not_ready'
        }
        socket.send(JSON.stringify(socketMessage))
    }

    function prevPlayer () {
        const activePlayer = $('.active-player')
        const activeIndex = activePlayer.data('index')
        const numItems = $('#player-slider').data('items')
        let prevIndex = (activeIndex - 1) % numItems

        if (prevIndex === -1) prevIndex = numItems - 1

        console.log(numItems, activeIndex, prevIndex)
        setPlayerSlide(prevIndex)
    }

    function nextPlayer () {
        const activePlayer = $('.active-player')
        const activeIndex = activePlayer.data('index')
        const numItems = $('#player-slider').data('items')
        const nextIndex = (activeIndex + 1) % numItems

        setPlayerSlide(nextIndex)
    }

    function bulletSlide () {
        const index = $(this).data('index')
        setPlayerSlide(index)
    }
})(jQuery)
