

function createDownloadHandler() {

    var $result = $('#crud-create-alert');
    var $url = $('#create-url');
    var $notify = $('#create-notify');
    var $button = $('#crud-create button');

//    function onFieldChange() {    }

    function onSubmit() {

        var payload = {};

        if ($url.val() && $url.val().length > 0) {
            payload.url = $url.val();
        }
        if ($notify[0].checked) {
            payload.notify = true;
        }
		payload = JSON.stringify(payload, null, 2);

        $.ajax({
            'method': 'POST',
            'url': 'downloads/',
            'data': payload,
            'headers': {
                'content-type': 'application/json'
            },
            'complete': function(xhr, textStatus) {
				if (xhr.status !== 200) {
                    $result.html(xhr.responseText);
                } else {
                    $result.html(xhr.responseText);
                }
            }
        });
    }

//    $url.keyup(onFieldChange);
//    $notify.change(onFieldChange);
    $button.click(onSubmit);
};

function listDownloadHandler() {

    var crudTable = $('#crud-list-table').dataTable({
        "bPaginate": false,
        "bFilter": false,
        "bInfo": false
		}
	);
    var $crudListAlert = $('#crud-list-alert');

	$.ajax({
		'method': 'GET',
		'cache': false,
		'url': 'downloads/list',
		'complete': function(xhr, textStatus) {
			if (xhr.status !== 200) {
				//$result.addClass('error');
				//$resultBody.html(xhr.responseText);
				$crudListAlert.html(xhr.responseText);
			} else {
				var data = xhr.responseJSON;
				crudTable.fnClearTable();
				for(var i = 0; i < data.length; i++) {
					crudTable.fnAddData(
						[ '<a href="'+data[i].url+'">'+data[i].url.substring(0, 50)+'</a>',
						  (data[i].status == 'available') ? '<a href="downloads/'+data[i]._id+'">'+data[i].filename.substring(0, 50)+'</a>' : '-',
						  data[i].filesize,
						  (data[i].created) ? new Date(data[i].created).toLocaleString() : '-',
						  (data[i].updated) ? new Date(data[i].updated).toLocaleString() : '-',
						  '<img src="icons/'+data[i].status+'.png" title="'+data[i].status+'" />',
						  data[i].notify,
						  '<img src="icons/delete.png" alt="delete" onClick="deleteDownloadHelper(\''+data[i]._id+'\')" />',
							data[i].created
						]
					);
				} // End For }, error: function(e){ console.log(e.responseText); } }); }
				crudTable.fnSort( [ [8,'desc'], [0,'asc'] ] );
			}
		}
	});

};

function deleteDownloadHelper (id) {
    var $crudListAlert = $('#crud-list-alert');

	$.ajax({
		'method': 'GET',
		'url': 'downloads/delete/'+id,
		'complete': function(xhr, textStatus) {
			if (xhr.status !== 200) {
				$crudListAlert.html('delete error');
			} else {
				location.reload();
			}
		}
	});
}

window.onload = function() {
    createDownloadHandler();
    listDownloadHandler();
};
