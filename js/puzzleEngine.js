function puzzleEngine(options) {
    options = options || {}
    var game = new Chess();
    var board, promote_to, promoting, piece_theme, promotionMove;
    var moveList, fen, moveNumber;
    var playerColor = 'white';
    piece_theme = '../img/chesspieces/wikipedia/{piece}.png';
    promotion_dialog = $('#promotion-dialog');
    promoting = false;
    moveNumber = 0;

    var onDragStart = function(source, piece, position, orientation) {
        var re = playerColor == 'white' ? /^b/ : /^w/
            if (game.game_over() ||
                piece.search(re) !== -1 || promoting === true) {
                return false;
            }
    };
    
    var promotion_dialog;
    promotion_dialog = $('#promotion-dialog');
    $("#promote-to").selectable({
        stop: function() {
          $( ".ui-selected", this ).each(function() {
            var selectable = $('#promote-to li');
            var index = selectable.index(this);
            if (index > -1) {
              var promote_to_html = selectable[index].innerHTML;
              var span = $('<div>' + promote_to_html + '</div>').find('span');
              promote_to = span[0].innerHTML;
            }
            promotion_dialog.dialog('close');
            $('.ui-selectee').removeClass('ui-selected');
            board.position(game.fen(), false);
          });
        }
      });

    var removeGreySquares = function() {
        $('#board .square-55d63').css('background', '');
      };
      
      var greySquare = function(square) {
        var squareEl = $('#board .square-' + square);
        
        var background = '#a9a9a9';
        if (squareEl.hasClass('black-3c85d') === true) {
          background = '#696969';
        }
      
        squareEl.css('background', background);
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

            $('.promotion-piece-q').attr('src', getImgSrc('q'));
            $('.promotion-piece-r').attr('src', getImgSrc('r'));
            $('.promotion-piece-n').attr('src', getImgSrc('n'));
            $('.promotion-piece-b').attr('src', getImgSrc('b'));

            //Promotion selection dialog
            promotion_dialog.dialog({
                modal: true,
                height: 100,
                width: 400,
                resizable: true,
                draggable: false,
                close: onDialogClose,
                closeOnEscape: false,
                dialogClass: 'noTitleStuff'
            }).dialog('widget').position({
                of: $('#board'),
                my: 'middle middle',
                at: 'middle middle',
            });
            return;
        }

        moveNumber++;
        game.move(move);
        moveNext();
    };

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

    var puzzleSolved = function(){
        console.log('success');
    }

    var puzzleFailed = function(){
        console.log('failure');
    }

    var onDialogClose = function() {
        promoting = false;
        //Check if move is from list
        if(moveList[moveNumber].substring(4) !== promote_to) return puzzleFailed();
        moveNumber++;    
        promotionMove.promotion = promote_to;
        game.move(promotionMove);
        moveNext();
      };

    function getImgSrc(piece) {
        return piece_theme.replace('{piece}', game.turn() + piece.toLocaleUpperCase());
    }

    var onMouseoverSquare = function(square, piece) {
        // get list of possible moves for this square
        var moves = game.moves({
          square: square,
          verbose: true
        });
      
        // exit if there are no moves available for this square
        if (moves.length === 0) return;
      
        // highlight the square they moused over
        greySquare(square);
      
        // highlight the possible squares for this piece
        for (var i = 0; i < moves.length; i++) {
          greySquare(moves[i].to);
        }
      };
      
      var onMouseoutSquare = function(square, piece) {
        removeGreySquares();
      };


    // update the board position after the piece snap
    // for castling, en passant, pawn promotion
    var onSnapEnd = function() {
        board.position(game.fen());
    };

    var cfg = {
        //showErrors: true,
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
            //uciCmd('setoption name Contempt value 0');
            //uciCmd('setoption name Skill Level value 20');
            //this.setSkillLevel(0);
            //uciCmd('setoption name King Safety value 0'); /// Agressive 100 (it's now symetric)
        },
        loadPgn: function(pgn) { game.load_pgn(pgn); },
        setPlayerColor: function(color) {
            playerColor = color;
            board.orientation(playerColor);
        },
        setSkillLevel: function(skill) {
            //var max_err,
            //    err_prob,
            //    difficulty_slider;
            //
            //if (skill < 0) {
            //    skill = 0;
            //}
            //if (skill > 20) {
            //    skill = 20;
            //}
            
            //time.level = skill;
            
            /// Change thinking depth allowance.
            //if (skill < 5) {
            //    time.depth = "1";
            //} else if (skill < 10) {
            //    time.depth = "2";
            //} else if (skill < 15) {
            //    time.depth = "3";
            //} else {
                /// Let the engine decide.
            //    time.depth = "";
            //}//
            
            //uciCmd('setoption name Skill Level value ' + skill);
            
            ///NOTE: Stockfish level 20 does not make errors (intentially), so these numbers have no effect on level 20.
            /// Level 0 starts at 1
            //err_prob = Math.round((skill * 6.35) + 1);
            /// Level 0 starts at 10
            //max_err = Math.round((skill * -0.5) + 10);
            
            //uciCmd('setoption name Skill Level Maximum Error value ' + max_err);
            //uciCmd('setoption name Skill Level Probability value ' + err_prob);
        },
        setTime: function(baseTime, inc) {
            time = { wtime: baseTime * 1000, btime: baseTime * 1000, winc: inc * 1000, binc: inc * 1000 };
        },
        setDepth: function(depth) {
            time = { depth: depth };
        },
        setNodes: function(nodes) {
            time = { nodes: nodes };
        },
        setContempt: function(contempt) {
            //uciCmd('setoption name Contempt value ' + contempt);
        },
        setAggressiveness: function(value) {
            //uciCmd('setoption name Aggressiveness value ' + value);
        },
        setDisplayScore: function(flag) {
            displayScore = flag;
            displayStatus();
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
            game.load(fen);
            board.position(fen);
            promoting = false;
        },
        undo: function() {
            game.undo();
            game.undo();
            promoting = false;
            return true;
        }
    };
}