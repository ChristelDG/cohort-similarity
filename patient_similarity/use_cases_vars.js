var use_cases = {
    "nephritis_in_SLE": "Nephritis in Systemic Lupus Erythematosus",
    "Osteoporosis": "Osteoporosis",
    "ILD_in_SSc": "Interstitial Lung Disease in Systemic Sclerosis",
    "Lung_infection" : "Lung infection"
}

var uc_prechecking = {
    "nephritis_in_SLE": nephro_lupus_prechecking,
    "Osteoporosis": osteoporose_prechecking,
    "ILD_in_SSc": pins_prechecking,
    "Lung_infection": infectious_lung_prechecking
}

var uc_index_patients = {
    "nephritis_in_SLE": nephro_lupus_index_patient,
    "Osteoporosis": osteoporose_index_patient,
    "ILD_in_SSc": pins_index_patient,
    "Lung_infection": infectious_lung_index_patient
}

var uc_labels = {
    "nephritis_in_SLE": nephro_lupus_labels,
    "Osteoporosis": osteoporose_labels,
    "ILD_in_SSc": pins_labels,
    "Lung_infection": infectious_lung_labels
}

var uc_patients = {
    "nephritis_in_SLE": nephro_lupus_patients,
    "Osteoporosis": osteoporose_patients,
    "ILD_in_SSc": pins_patients,
    "Lung_infection": infectious_lung_patients
}

var uc_data = {
    "nephritis_in_SLE" : nephro_lupus_data,
    "Osteoporosis": osteoporose_data,
    "ILD_in_SSc": pins_data,
    "Lung_infection": infectious_lung_data
}

var uc_sim_matrix = {
    "nephritis_in_SLE" : nephro_lupus_sim_matrix,
    "Osteoporosis": osteoporose_sim_matrix,
    "ILD_in_SSc": pins_sim_matrix,
    "Lung_infection": infectious_lung_sim_matrix
}

var uc_word_cloud_data = {
    "nephritis_in_SLE" : nephro_lupus_word_cloud_data,
    "Osteoporosis": osteoporose_word_cloud_data,
    "ILD_in_SSc": pins_word_cloud_data,
    "Lung_infection": infectious_lung_word_cloud_data
}
