// REFRESH FROM http://www.meadow.se/wordpress/refreshing-data-in-jquery-datatables/

function retryDownloadHelper(id) {
    var $crudAlert = $('#crud-alert');
	$crudAlert.html('Retry request submitted...');

	$.ajax({
		'method': 'GET',
		'url': 'downloads/retry/'+id,
		'complete': function(xhr, textStatus) {
			//console.log(xhr);
			if (xhr.status !== 200) {
				$crudAlert.html('Retry request error');
				window.setTimeout(updateListDownloads(), 2000);
			} else {
				$crudAlert.html('Retry request successful !');
				window.setTimeout(updateListDownloads(), 2000);
			}
		}
	});
}

function deleteDownloadHelper (id) {
    var $crudAlert = $('#crud-alert');
	$crudAlert.html('Delete request submitted...');

	$.ajax({
		'method': 'GET',
		'url': 'downloads/delete/'+id,
		'complete': function(xhr, textStatus) {
			//console.log(xhr);
			if (xhr.status !== 200) {
				$crudAlert.html('Delete request error...');
				window.setTimeout(updateListDownloads(), 2000);
			} else {
				$crudAlert.html('Delete request successful !');
				window.setTimeout(updateListDownloads(), 2000);
			}
		}
	});
}

function getDownloadHelper (id) {
	window.location = 'downloads/'+id;
}

function initListDownloads() {
    var crudTable = $('#crud-list-table').dataTable({
        "bPaginate": false,
        "bFilter": false,
        "bInfo": false,
		"retrieve": true,
		"bJQueryUI": true,
		"sAjaxSource": 'downloads/list'
		}
	);
};

function createDownloadHandler() {
    var $url = $('#create-url');
    var $notify = $('#create-notify');
    var $button = $('#new-url-form button');

    function onSubmit() {
		var $crudAlert = $('#crud-alert');

		var formData = {};
		$crudAlert.html('Download request submitted...');

        if ($url.val() && $url.val().length > 0) {
            formData.url = $url.val();
        }
        if ($notify[0].checked) {
            formData.notify = true;
        }
		formData = JSON.stringify(formData, null, 2);

        $.ajax({
            'method': 'POST',
            'url': 'downloads/',
            'data': formData,
            'headers': {
                'content-type': 'application/json'
            },
			'complete': function(xhr, textStatus) {
				if (xhr.status !== 200) {
					$crudAlert.html('Download request error : '+xhr.responseText);
                } else {
					$crudAlert.html('Download request successful !');
                }
				window.setTimeout(updateListDownloads(), 2000);

			}

        });

		$('#new-url-form')[0].reset();
		return true;
    }

    $button.click(onSubmit);
};

function updateListDownloads() {

	$.getJSON('downloads/list', null, function( data )
	{
		var crudTable = $('#crud-list-table').dataTable();
		if (crudTable && data) {
			oSettings = crudTable.fnSettings();
			crudTable.fnClearTable(this);

			for (var i=0; i<data.length; i++)
			{
				data[i].pourcentage = parseInt(data[i].fileprogress/data[i].filesize*100);
				(isNaN(data[i].pourcentage)) ? (data[i].pourcentage = 0): '';

				var actions = '<button type="button" class="btn btn-danger btn-sm" onClick="deleteDownloadHelper(\''+data[i]._id+'\')">Delete</button>&nbsp;';

				if (data[i].status === 'available') {
					actions += '<button type="button" class="btn btn-success btn-sm" onClick="getDownloadHelper(\''+data[i]._id+'\')">Retrieve</button>&nbsp;';
				} else if (data[i].status !== 'submitted') {
					actions += '<button type="button" class="btn btn-info btn-sm" onClick="retryDownloadHelper(\''+data[i]._id+'\')">Retry</button>';
				}

				crudTable.fnAddData(
					[ '<a target="_blank" href="'+data[i].url+'">'+data[i].url.substring(0, 70)+'</a>',
		//						  (data[i].status == 'available') ? '<a href="downloads/'+data[i]._id+'">'+data[i].filename.substring(0, 50)+'</a>' : '-',
					  ('<div class="progress"><div class="progress-bar progress-bar-success" role="progressbar" aria-valuenow="'+data[i].pourcentage+'" aria-valuemin="0" aria-valuemax="100" style="min-width: 2em; width:'+data[i].pourcentage+'%">'+data[i].pourcentage+'%</div></div>'),
					  (data[i].created) ? new Date(data[i].created).toLocaleString() : '-',
					  (data[i].updated) ? new Date(data[i].updated).toLocaleString() : '-',
					  '<img src="icons/'+data[i].status+'.png" title="'+data[i].status+'" />',
					  filesize(data[i].fileprogress, {spacer:''}),
					  //data[i].notify,
					  //'<img src="icons/delete.png" alt="delete" onClick="deleteDownloadHelper(\''+data[i]._id+'\')" />'
					  actions
		//					,	data[i].created
					]
				);
			}

			oSettings.aiDisplay = oSettings.aiDisplayMaster.slice();
			crudTable.fnDraw();
		}
	});


}

function autoReload() {
	var $crudAlert = $('#crud-alert');
	$crudAlert.html('');
	updateListDownloads();
	setTimeout(function(){autoReload();}, 20000);
}

window.onload = function() {
	$("form").on('submit', function (e) {
		// remove default submit event
		e.preventDefault();
	});

    createDownloadHandler();
    initListDownloads();
	updateListDownloads();
	// auto reload table
	setTimeout(function(){autoReload();}, 20000);
};

