var patient_label_size = 150;
var label_height = 150;
var patient_height = 16;
var label_width = 80;


var current_patient = "";
var empty_check_boxes = true;

var current_use_case_id;
var data;
var labels;
var patients;
var sim_matrix;
var patient_number;
var index_patient;
var label_number;
var label_weights;
var word_cloud_custom_data;
var prechecked;

var margin;
var width;
var height;


//var check_boxes = Array();

var mouseleave = function(d) {
    d3.select("#tooltip")
        .style("opacity", 0)
}

// Use case buttons
var links = d3.select("#links");
for (short_name in use_cases) {
    long_name = use_cases[short_name]
    links.append("div")
        .attr("class", "col-sm-3 vcenter buttons")
        .html("<a role='button' name='" + long_name + "' index='" + short_name + "' id='button_" + short_name + "' class='btn btn-block btn-primary btn-lg use_case'>Use case &quot;" + short_name.replaceAll("_", " ") + "&quot;</a>");
    $('#button_' + short_name).on('click', function (e) {
        $('#links a').removeClass('active');
        $(this).addClass("active");
        show_heatmap($(this).attr("index"), $(this).attr("name"));
    });
        
}

var heatmap;


function normalize_weights(label_number) {
    $('*').css('cursor','progress');

    var found = false;
    var weights = math.zeros(label_number, label_number);

    // initialize to empty word cloud
    word_cloud_custom_data = {}
    for (var p_id in uc_word_cloud_data[current_use_case_id]) {
        word_cloud_custom_data[p_id] = Array();
    }
    // Parse all checkboxes and add words for checked boxes
    $('.cb_label').each(function(i, obj) {
        if (obj.checked) {
            found = true;
            label = obj.getAttribute('label');
            index = parseInt(obj.getAttribute('index'));

            // cloud
            for (var p_id in word_cloud_custom_data) {
                for (var i = 0; i < uc_word_cloud_data[current_use_case_id][p_id].length; i++) {
                    var row = uc_word_cloud_data[current_use_case_id][p_id][i];
                    if (row["category"] == labels[index]) {
                        word_cloud_custom_data[p_id].push(row);
                    }
                }
            }
            
            // weights
            weights = math.subset(weights, math.index(index, index), 1);
            for (var i = 0 ; i < label_number ; i++) {
                if (i != index) {
                    if (math.subset(weights, math.index(i, i)) > 0) {
                        weights = math.subset(weights, math.index(index,i), beta);
                        weights = math.subset(weights, math.index(i, index), beta);
                    }
                }
            }
            
            //alert(i + " " + obj);
        }
    });
    // if no box is checked, keep all labels
    if (!found) {
        // Parse all checkboxes and add words for checked boxes
        $('.cb_label').each(function(i, obj) {
            index = parseInt(obj.getAttribute('index'));
            label = obj.getAttribute('label');

            // could
            for (var p_id in uc_word_cloud_data[current_use_case_id]) {
                for (var i = 0; i < uc_word_cloud_data[current_use_case_id][p_id].length; i++) {
                    var row = uc_word_cloud_data[current_use_case_id][p_id][i];
                    if (row["category"] == label) {
                        word_cloud_custom_data[p_id].push(row);
                    }
                }
            }
            
            // weights
            weights = math.subset(weights, math.index(index, index), 1);
            for (var i = 0 ; i < label_number ; i++) {
                if (i != index) {
                    if (math.subset(weights, math.index(i, i)) > 0) {
                        weights = math.subset(weights, math.index(index,i), beta);
                        weights = math.subset(weights, math.index(i, index), beta);
                    }
                }
            }
            
            //alert(i + " " + obj);
        });
    }
    return weights;
}

function build_heatmap() {
    heatmap.html('')

    // append the svg object to the body of the page
    //var svg = d3.select("#my_dataviz")
    var svg = heatmap
    .append("svg")
      .attr("width", patient_label_size + width + margin.left + margin.right)
      .attr("height", label_height + height + margin.top + margin.bottom)
    .append("g")
      .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // weight matrix : (label_num x label_num) 
    //                 cross-label weights to be used to compute final similarity
    //                 - diagonal = individual label weight
    //                 - other cells = weight for a pair of labels
    // 1. Repeat the weight matrix for each patient -> (patient x label_num x label_num)
    var label_weights_3d = math.matrix(math.map(math.range(0,patient_number), 
                                                function(value) {return label_weights}))
    // 2. Element-wise multiplication of distance tensor x weights
    //    in order to obtain label-weighted similarities
    //    -> (patient_num x labels x labels)
    var weighted_similarities = math.dotMultiply(sim_matrix, label_weights_3d)
    // 3. Sum similarity over all labels, for each patient
    //    -> (patient_num)
    var patient_similarities = math.apply(math.apply(weighted_similarities, 2, math.sum),
                                          1, math.sum)
    // 4. Normalize similarities
    var norm_patient_similarities = math.divide(patient_similarities, math.sum(label_weights))
    
    // 5. Convert similarities into distances
    var patient_distances = math.subtract(1, norm_patient_similarities)
    var patient_info = []
    for (var i = 0; i < patients.length ; i++) {
        patient_info.push({'patient':patients[i], 'score':math.subset(patient_distances, math.index(i))})
    }
    patient_info = patient_info.slice().sort((a, b) => d3.ascending(a.score, b.score))
    var sorted_patients = patient_info.map(x => x.patient);
    //for (var i = 0; i < patient_info.length ; i++) {
    //}

    // Build X scales and axis:
    var x = d3.scaleBand()
      .range([ 0, width ])
      .domain(labels)
      .padding(0.05);


    // Build Y scales and axis:
    var y = d3.scaleBand()
      .range([ 0, height ])
      .domain(sorted_patients)
      .padding(0.05);
    svg.append("g")
      .style("font-size", 15)
      .style("color", "gray")
      .attr("transform", "translate(" + patient_label_size + "," + 0 + ")")
      .call(d3.axisLeft(y).tickSize(0))
      .select(".domain").remove();

    // Build color scale
    var myColor = d3.scaleSequential()
      .interpolator(d3.interpolateInferno)
      .domain([0,1]);

    // create a tooltip
    var tooltip = heatmap
        .append("div")
        .style("opacity", 0)
        .attr("class", "tooltip")
        .attr("id", "tooltip")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "2px")
        .style("border-radius", "5px")
        .style("padding", "5px")
        .style("height", 330 + "px")
        .style("width", 900 + "px")    
        .style("position", "absolute");    
    
    // Three function that change the tooltip when user hover / move / leave a cell
    var mouseover = function(e, d) {
        //d3.select(this)
        //    .style("stroke", "black")
        //    .style("opacity", 1);
//        tooltip.html("<h3>Patient " + this.getAttribute('index') + "</h3><div id='word_cloud'></div>");
        var top = d3.pointer(e, this)[1] + label_height + margin.top + $('#header').height() + $('#lead').height() + 60;// + $('#label_header').height();
        var left = d3.pointer(e, this)[0]-150;
        if (this.getAttribute('index') != current_patient) {
            tooltip.html("<div style='width:100%;height:100%' id='word_cloud'></div>");        
            
            current_patient = this.getAttribute('index');
            // create a tag (word) cloud chart
            var chart = anychart.tagCloud(word_cloud_custom_data[current_patient]);
            chart.title("Patient " + current_patient);
            // set an array of angles at which the words will be laid out
            chart.angles([0])
            // enable a color range
            chart.colorRange(true);
            // set the color range length
            chart.colorRange().length('80%');
            // display the word cloud chart
            chart.container("word_cloud");
            chart.draw();
        }
        tooltip
            .style("opacity", 1)
            .style("left", left + "px")
            .style("top", top + "px");
  
    }

    // add the squares
    svg.selectAll()
        .data(data, function(d) {return d.group+':'+d.variable;})
        .enter()
        .append("rect")
        .attr("x", function(d) { return x(d.group)+patient_label_size })
        .attr("y", function(d) { return y(d.variable) })
        .attr("rx", 4)
        .attr("ry", 4)
        .attr("width", x.bandwidth() )
        .attr("height", y.bandwidth() )
        .attr("index", function(d) {return d.variable})
        .style("fill", function(d) { return myColor(d.value)} )
        .style("stroke-width", 4)
        .style("stroke", "none")
        .style("opacity", 0.8)
        .on("mouseover", mouseover);
//        .on("mousemove", mousemove);

    // Index patient word cloud
    $("#index_word_cloud").html("");
    // create a tag (word) cloud chart
    var chart = anychart.tagCloud(word_cloud_custom_data[index_patient]);
    // set an array of angles at which the words will be laid out
    chart.angles([0]);
    // enable a color range
    chart.colorRange(true);
    // set the color range length
    chart.colorRange().length('80%');
    // display the word cloud chart
    chart.container("index_word_cloud");
    chart.draw();
    $('*').css('cursor','default');    
}



function show_heatmap(use_case_id, long_name) {
    d3.select("#demo").html("");

    empty_check_boxes = true;

    current_use_case_id = use_case_id;
    data = uc_data[use_case_id];
    labels = uc_labels[use_case_id];
    patients = uc_patients[use_case_id];
    sim_matrix = uc_sim_matrix[use_case_id];
    patient_number = patients.length;
    index_patient = uc_index_patients[use_case_id];
    label_number = labels.length;
    label_weights = math.zeros(label_number, label_number);
    //word_cloud_custom_data = JSON.parse(JSON.stringify(uc_word_cloud_data[use_case_id]));
    prechecked = uc_prechecking[use_case_id];

    margin = {top: 20, right: 25, bottom: 30, left: 200};
    width = label_width * labels.length;
    height = (patient_height * patient_number) + label_height - margin.top - margin.bottom;
    
    var lead = d3.select("#demo")
        .append("div")
//        .attr("class", "container")
        .attr("id", "lead");

    // Index patient info
    lead.html("<div id='desc' style='display:inline-block;margin-left:2em;width:35%'><h3>" + long_name + "</h3><p>The patient for this use case is <strong>" + index_patient + "</strong>. The most relevant labels for this use case are <strong>" + prechecked + "</strong>.</p><p>The full content of the patient records cannot be shown in this demo for privacy reasons. The most relevant terms for the labels checked below are extracted automatically with the method described in the companion article.</p></div><div id='index_word_cloud' style='display:inline-block;width:60%'></div>");

//    d3.select("#index_word_cloud")
//        .style("height", 330 + "px")
//        .style("width", 900 + "px")    

    var mix_table = d3.select("#demo")
        .append("div")
        .attr("id", "mixtable");

    
    // Heatmap
    heatmap = d3.select("#demo")
        .append("div")
        .attr("id", "heatmap")
        .style("overflow-y", "auto")
        .style("overflow-x", "auto")
        .on("mouseleave", mouseleave);
    
    var label_header = mix_table.append('div')
        .attr("id", "label_header")
        .style("display", "inline-block")
        .style("vertical-align", "bottom")
        .style("width", (margin.left + patient_label_size + labels.length * label_width + 20) + "px")
        .style("height", label_height + "px")
    
    
    label_header.html('<span style="font-weight:bold;text-align:right;vertical-align:bottom;display:inline-block; width: ' + (margin.left + patient_label_size) + 'px; height: ' + label_height + 'px;"><br/><br/>Most similar patients ranked below are those who share the same medical concepts or close synonyms<br/>Shown labels are those present in the seed patient record.</span>');
    
    label_header.selectAll().data(labels)
        .enter()
        .append('span')
        .style('width', label_width + 'px')
        .style('display', 'inline-block')
        .style('transform', 'rotate(-65deg)')
        .style('margin', '0')
        .html(function(d, i) {return "<span style='vertical-align:bottom;display:block;width:" + label_height + "px'>&nbsp;&nbsp;&nbsp;<input type='checkbox' label='" + d + "' index='" + i + "' class='cb_label' name='cb_" + d + "' id='cb_" + d + "'></input><label style='color:gray; ' for='cb_" + d + "'>" + d + "</label></span>"})
    
    label_header.selectAll('input')
        .on('change', function(v) {label_weights = normalize_weights(labels.length); build_heatmap(); })
    
    for (var i = 0 ; i < prechecked.length ; i++) {
        $("#cb_" + prechecked[i]).prop("checked", true);
    }
    label_weights = normalize_weights(labels.length);
    build_heatmap();
    
    // Add title to graph
    //svg.append("text")
    //        .attr("x", 0)
    //        .attr("y", -50)
    //        .attr("text-anchor", "left")
    //        .style("font-size", "22px")
    //        .text("Similarité patient");
}
