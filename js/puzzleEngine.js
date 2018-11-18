function puzzleEngine(options) {
    options = options || {}
    var game = new Chess();
    var board, promoteTo, promoting, piece_theme, promotionMove;
    var moveList, fen, moveNumber;
    var puzzleActive = true, resultSend = false;
    var playerColor = 'white';
    piece_theme = '../img/chesspieces/wikipedia/{piece}.png';
    promotion_dialog = $('#promotion-dialog');
    promoting = false;
    moveNumber = 0;

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
        return piece_theme.replace('{piece}', game.turn() + piece.toLocaleUpperCase());
    }

    promotionDialog = $('#promotion-dialog');
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
            promotionDialog.dialog('close');
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
        //Check if move is from solution
        if(moveList[moveNumber].substring(4) !== promoteTo) return puzzleFailed();
        moveNumber++;    
        promotionMove.promotion = promoteTo;
        game.move(promotionMove);
        moveNext();
    }
    promotionDialog.dialog({
        autoOpen: false,
        modal: true,
        height: 100,
        width: 400,
        resizable: false,
        draggable: false,
        close: onDialogClose,
        closeOnEscape: false,
        dialogClass: 'noTitleStuff'
    });
    //#endregion

    var moveNext = function() {
        if(moveList.length === moveNumber) return puzzleSolved();
        var sourceNextMove = moveList[moveNumber].substring(0,2);
        var targetNextMove = moveList[moveNumber].substring(2,4);
        var targetPromotion = moveList[moveNumber].substring(4,5);
        moveNumber++;
        game.move({
            from: sourceNextMove,
            to: targetNextMove,
            promotion: targetPromotion ? targetPromotion : 'q'});
            if(moveList.length === moveNumber) return puzzleSolved();
    };

    function showSolution(){///TODO: fix, dosent work
        game.load(fen);
        board.position(fen);
        promoting = false;
        moveNumber = 0;
        for(var i = 0 ; i < moveList.length; ++i){
            moveNext();
        }
    }

    var puzzleSolved = function(){
        if(puzzleActive){
            $("#nextPuzzleButton").addClass("btn-success").removeClass("btn-secondary");
            console.log('success');
            //TODO: Send data about puzzle success
            resultSend = true;
        }
    }

    var puzzleFailed = function(){
        if(resultSend === false){
            $("#nextPuzzleButton").addClass("btn-danger").removeClass("btn-secondary");
            console.log('failure');
            //TODO: Send data about failed puzzle
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
        //removeGreySquares();

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

        //Check if move is valid to puzzle
        if(source + target !== moveList[moveNumber].substring(0,4)) return puzzleFailed();

        if (piece === 'p' &&
            ((source_rank === '7' && target_rank === '8') || (source_rank === '2' && target_rank === '1'))) {
            promoting = true;
            promotionMove = move;

            promotionDialog.dialog("open").dialog('widget').position({
                my: 'middle',
                at: 'middle',
                of: $('#board'),
            });
            return;
        }

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
        pieceTheme: piece_theme,
        //onMouseoutSquare: onMouseoutSquare,//
        //onMouseoverSquare: onMouseoverSquare,//
        onSnapEnd: onSnapEnd
    };

    board = new ChessBoard('board', cfg);

    return {
        reset: function() {
            game.reset();
        },
        loadPgn: function(pgn) { game.load_pgn(pgn); },
        setPlayerColor: function(color) {
            playerColor = color;
            board.orientation(playerColor);
        },
        start: function() {
            //get new task from database
            //Task task = getRandomTask();
            //////////////
            var color = 'white';
            var fenPosition = '8/3P3P/8/1k6/8/6K1/1p1p4/8 w - - 0 1';
            var moves = 'd7d8q b5a4 d8d2 b2b1q h7h8q';
            /////////////
            fen = fenPosition;
            moveList = moves.split(' ');
            playerColor = color;
            this.setPlayerColor(color);
            //
            moveNumber = 0;
            game.load(fen);
            board.position(fen);
            promoting = false;
        }
    };
}