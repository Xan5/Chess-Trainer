function puzzleEngine() {
    var game = new Chess();
    var board;
    var promoteTo, promoting, pieceTheme, promotionMove, promoting = false;
    var moveList, fen, moveNumber, desc, counter, moves, moveNumber = 0;
    var puzzleActive = true, resultSend = false;
    var winCounter = 0; loseCounter = 0;
    pieceTheme = '../img/chesspieces/wikipedia/{piece}.png';
    

    // Initialize Firebase
    var config = {
        apiKey: "AIzaSyD4XMHN12FFTn2ZX27Sbi32nXR3GwBONVw",
        authDomain: "chess-trainer-39bf7.firebaseapp.com",
        databaseURL: "https://chess-trainer-39bf7.firebaseio.com",
        projectId: "chess-trainer-39bf7",
        storageBucket: "chess-trainer-39bf7.appspot.com",
        messagingSenderId: "1040142128831"
    };
    if (!firebase.apps.length) {
        firebase.initializeApp(config);
    }
    

    var getPuzzlesCounter = function(){
        firebase.database().ref('/').once('value').then(function(snapshot) {
            counter = (snapshot.val() && snapshot.val().puzzleCounter) || 1;
            getPuzzle();
        });
    }

    function getPuzzle(){      
        firebase.database().ref('/puzzles/p' + (Math.floor(Math.random() * counter) + 1).toString()).once('value').then(function(snapshot) {
            desc = (snapshot.val() && snapshot.val().description) || 'Anonymous game';
            fen = (snapshot.val() && snapshot.val().fen);
            moves = (snapshot.val() && snapshot.val().moves); 
            moveList = moves.match(/\w\S+\w\S?/gm);
            moveNumber = 0;
            game.load(fen);
            board.position(fen);
            promoting = false;
            playerColor = game.turn() === "w" ? "white": "black";
            fillPuzzleInfo();
        });
    }
    
    function fillPuzzleInfo(){
        $('#puzzleDesc').html(desc);
        if(moveList.length < 4){
            $('#puzzleDiff').html("low");
        }else
        if(moveList.length < 6){
            $('#puzzleDiff').html("medium");
        }else
        if(moveList.length < 8){
            $('#puzzleDiff').html("high");
        }
    }

    //#region Dialogs/Buttons setup
    $( "#nextPuzzleButton" ).click(function() {
            puzzleFailed();
            resultSend = false;
            puzzleActive = true;
            $("#nextPuzzleButton").addClass("btn-secondary").removeClass("btn-danger").removeClass("btn-success");
    });
    $( "#showSolutionButton" ).click(function() {
        puzzleFailed();
        showSolution();
    });

    $('.contextmenu').hide();
    $('body').contextmenu(function(e){
        $('.contextmenu').show();
        $('.contextmenu').offset({left:e.pageX,top:e.pageY});
    });
    $('body').click(function(){
        $('.contextmenu').hide();
    });
 
    function getImgSrc(piece) {
        return pieceTheme.replace('{piece}', game.turn() + piece.toLocaleUpperCase());
    }

    $("#promote-to").selectable({
        stop: function() {
          $( ".ui-selected", this ).each(function() {
            var selectable = $('#promote-to li');
            var index = selectable.index(this);
            if (index > -1) {
              var promoteToHtml = selectable[index].innerHTML;
              var span = $('<div>' + promoteToHtml + '</div>').find('span');
              promoteTo = span[0].innerHTML;
            }
            $('#promotion-dialog').dialog('close');
            $('.ui-selectee').removeClass('ui-selected');
            board.position(game.fen(), false);
          });
        }
    });
    $('.promotion-piece-q').attr('src', getImgSrc('q'));
    $('.promotion-piece-r').attr('src', getImgSrc('r'));
    $('.promotion-piece-n').attr('src', getImgSrc('n'));
    $('.promotion-piece-b').attr('src', getImgSrc('b'));
    var onDialogClose = function() {
        promoting = false;
        //Check if move is valid to puzzle
        if(move.san !== moveList[moveNumber]) return puzzleFailed();

        if(moveList[moveNumber] !== promotionMove.san + promoteTo) return puzzleFailed();
        moveNumber++;    
        promotionMove.promotion = promoteTo;
        game.move(promotionMove);
        moveNext();
    }
    $('#promotion-dialog').dialog({
        autoOpen: false,
        modal: true,
        height: 100,
        width: 320,
        resizable: false,
        draggable: false,
        close: onDialogClose,
        closeOnEscape: false,
        dialogClass: 'noTitleStuff'
    });
    //#endregion

    var moveNext = function() {
        if(moveList.length === moveNumber) return puzzleSolved();
        moveNumber++;
        game.move(moveList[moveNumber - 1]);
        if(moveList.length === moveNumber) return puzzleSolved();
    };

    var showSolution = function(){
        game.load(fen);
        board.position(fen);
        promoting = false;
        moveNumber = 0;
        setTimeout( function(){        
            board.position(game.fen());
        }, 500);
        for(var i = 1 ; i <= moveList.length; ++i){
            setTimeout( function(){
                moveNext();         
                board.position(game.fen());
            }, 500 * i);
        }
    }

    var puzzleSolved = function(){
        if(puzzleActive && resultSend === false){
            $("#nextPuzzleButton").addClass("btn-success").removeClass("btn-secondary");
            winCounter++;
            $('#winScore').html(winCounter);
            resultSend = true;
        }
    }

    var puzzleFailed = function(){
        if(resultSend === false){
            $("#nextPuzzleButton").addClass("btn-danger").removeClass("btn-secondary");
            loseCounter++;
            $('#loseScore').html(loseCounter);
            resultSend = true;
            puzzleActive = false;
        }
    }
        
    var onDragStart = function(source, piece, position, orientation) {
        var re = playerColor == 'white' ? /^b/ : /^w/
            if (game.game_over() || resultSend ||
                piece.search(re) !== -1 || promoting === true) {
                return false;
            }
    };
    
    var onDrop = function(source, target) {
        var move = game.move({
            from: source,
            to: target,
            promotion: 'q'
        });
        // Check if move is legal to puzzle
        if (move === null) return 'snapback';
        else game.undo();

        var source_rank = source.substring(2,1);
        var target_rank = target.substring(2,1);
        var piece = game.get(source).type;
        if (piece === 'p' &&
            ((source_rank === '7' && target_rank === '8') || (source_rank === '2' && target_rank === '1'))) {
            promoting = true;
            promotionMove = move;

            $('#promotion-dialog').dialog("open").dialog('widget').position({
                my: 'middle',
                at: 'middle',
                of: $('#board'),
            });
            return;
        }

        //Check if move is valid to puzzle
        if(move.san !== moveList[moveNumber]) return puzzleFailed();

        //Make move
        moveNumber++;
        game.move(move);
        moveNext();
    };

    var onSnapEnd = function() {
        board.position(game.fen());
    };

    var cfg = {
        draggable: true,
        onDragStart: onDragStart,
        onDrop: onDrop,
        pieceTheme: pieceTheme,
        onSnapEnd: onSnapEnd
    };

    board = new ChessBoard('board', cfg);

    return {
        reset: function() {
            getPuzzlesCounter();
            game.reset();
        },
        loadPgn: function(pgn) { game.load_pgn(pgn); },
        setPlayerColor: function(color) {
            playerColor = color;
            board.orientation(playerColor);
        },
        start: function() {
            getPuzzle(); 
        }
    };
}