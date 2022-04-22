"""
Module to compute distances between clinical notes
Two main functions : 
distance_files_by_lab : compute a distance between two clinical notes on one axes 
distance_files_cross_lab : computes  
"""


import os
import numpy as np
import pandas as pd 
import random

import sklearn
from scipy.spatial.distance import cosine
from sklearn.metrics import euclidean_distances
from sklearn.feature_extraction.text import CountVectorizer

import matplotlib.pyplot as plt

import wordcloud

from sklearn.model_selection import train_test_split
from sklearn.metrics import euclidean_distances
from tqdm import tqdm

import random

from pyemd import emd




# first function used for flattening 
def flatten(t):
    return [item for sublist in t for item in sublist]




def distance_files_by_lab(df, file_1, file_2, Embedding, label, Distance_type = 'cosine', verbose = True) :
    """
    Compute a distance between two clinical notes, based on the embedding of their extracted terms, based on EMD distance
        Args :
        -----
        df :dataframe containing "file_name", list of extracted terms with corresponding "fastextEmbeddings" and "BERTEmbeddings"
        file_1 : name of the first file to compare 
        file_2 : name of the second files (corresponding to another patient or same patient at different time)
        Embedding : type of embedding should be Fasttext or local_BERT or EDS_BERT
        Distance_type : should be "cosine" ou "euclid"
        label : label we want to compute the distance on
        verbose : if True : print detailed informations
        
        Outputs: 
        D_EMD : final distance 
    """
    if verbose:
        print(f'\n ----- Computing the distance between {file_1} and {file_2} for label {label}')
    # first get the common dataframe shared by the two files 
    df_reduc = df[(df["source"]== file_1) | (df["source"]== file_2)]
    # get the total number of terms 
    term_tot = len(df_reduc)
    
    # get the set of corresponding labels 
    labels = set(df_reduc['label'])
    if verbose: 
        print('Set of labels for the two patients', labels)
    

    df_patient_1 = df[df["source"]== file_1]
    df_patient_2 = df[df["source"]== file_2]
    
    labels_patient_1 = set(df_patient_1['label'])
    labels_patient_2 = set(df_patient_2['label'])
    
    # check if the label 
    labels_common = labels_patient_1.intersection(labels_patient_2)
  
    if label not in labels_common :
        if verbose :
            print(f"this label {label} is not shared byt he two patients {file_1}, {file_2}")
            print("fonction will return a None object")
            
        return None

    # get the corresponding vocabulary of this label for the two files : 
    vocab_df = df_reduc[df_reduc['label']== label]
    vocab_size = len(vocab_df)
    if verbose :
        print(f'For the label "{label}", the vocabulary size is', vocab_size)
        print(vocab_df)
        
    # convert it to a dict readable for the CountVectorizer function 
    vocab = {}
    j = 0
    for i in vocab_df['idx']:
        if vocab_df['term'][i] not in vocab.keys():
            vocab[vocab_df['term'][i]] = j
            j += 1
        
    # get a representation feature 
    vect = CountVectorizer(vocabulary = vocab, tokenizer = lambda x : [x], lowercase = False)# .fit([d1,d2,d3])
    # print("\n Features:\n","\n".join(vect.get_feature_names()))
        
    # get the terms for each file
    d1 = vocab_df[vocab_df['source']== file_1]
    term_1 = d1['term'].to_list()
    if verbose:
        print(f'\n terms patient 1 for label {label}\n', term_1)
    
    d2 = vocab_df[vocab_df['source']== file_2]
    term_2 = d2['term'].to_list()
    if verbose:
        print(f'\n terms patient 2 for label {label}\n', term_2)
    
    # get the corresponding histograms 
    v1_1 = vect.transform(term_1).toarray()
    v_1 = np.sum(v1_1, 0)
    v2_1 = vect.transform(term_2).toarray()
    v_2 = np.sum(v2_1, 0)
    
    # print(v_1, v_2)
    # print("\n cosine(doc_1, doc_2) = {:.2f}".format(cosine(v_1, v_2)))
    
    # get the FastText of BERT_embedding associated  
    idx_w = [vocab_df[vocab_df['term'] == w].iloc[0].idx for w in vect.get_feature_names()]
    W_2 = []

    for idx in idx_w:
        # print('\n------idx', idx)
        if (Embedding == 'Fasttext'): 
            W_2.append(vocab_df['fastext_embeddings'][int(idx)])

        elif Embedding == "local_BERT": 
            W_2.append(vocab_df['BERT_embeddings'][int(idx)])
        
        elif (Embedding == "EDS_BERT"): 
            # print('idx', idx)
            # print(vocab_df['EDS_BERT_embeddings'][int(idx)])
            W_2.append(vocab_df['EDS_BERT_embeddings'][int(idx)])
                
    if Distance_type == 'cosine':
        Dist = sklearn.metrics.pairwise.cosine_distances(W_2) # cosine_distance : ie 1-cos similarity = 1-cos(theta)
    if Distance_type == 'euclid':
        Dist = euclidean_distances(W_2)
    
    # distance computation : 
    # pyemd needs double precision input
    v_1 = v_1.astype(np.double)
    v_2 = v_2.astype(np.double)
    
    v_1 /= v_1.sum()
    v_2 /= v_2.sum()
    
    Dist = Dist.astype(np.double)
    if Dist.max() != 0:
        Dist /= Dist.max()  # just for comparison purposes
    D_EMD = emd(v_1, v_2, Dist)
    
             
    if verbose:
        print(f'\nDistance {Distance_type} for label {label} between {file_1} and {file_2} =',D_EMD)
    
    return D_EMD







def distance_files_cross_lab(df, file_1, file_2, Embedding, label_1, label_2, Distance_type = 'cosine', verbose = True) :
    """
    Compute a distance between two clinical notes, based on the embedding of their extracted terms, based on EMD distance
        Args :
        -----
        df :dataframe containing "file_name", list of extracted terms with corresponding "fastextEmbeddings" and "BERTEmbeddings"
        file_1 : name of the first file to compare 
        file_2 : name of the second files (corresponding to another patient or same patient at different time)
        Embedding : type of embedding should be Fasttext or local_BERT or EDS_BERT
        Distance_type : should be "cosine" ou "euclid"
        label_1 : 1st label we want to compute the distance on
        label_2 : 2nd label 
        verbose : if True : print detailed information
        
        Outputs: 
        D_EMD : final distance 
    """
    if verbose:
        print(f'\n ----- Computing the distance between {file_1} and {file_2} for labels {label_1, label_2}')
    # first get the common dataframe shared by the two files 
    df_reduc = df[(df["source"]== file_1) | (df["source"]== file_2)]
    # get the total number of terms 
    term_tot = len(df_reduc)
    
    # get the set of corresponding labels 
    labels = set(df_reduc['label'])
    if verbose: 
        print('Set of labels for the two patients', labels)
    

    df_patient_1 = df[df["source"]== file_1]
    df_patient_2 = df[df["source"]== file_2]
    
    labels_patient_1 = set(df_patient_1['label'])
    labels_patient_2 = set(df_patient_2['label'])
    
    # check if the label 
    labels_common = labels_patient_1.intersection(labels_patient_2)
  
    if label_1 not in labels_common :
        if verbose : 
            print(f"these label {label_1} are not shared by the patients {file_1}, {file_2}")
            print("fonction will return a None object")
        return None
    
    if label_2 not in labels_common :
        if verbose : 
            print(f"these label {label_2} are not shared by the patients {file_1}, {file_2}")
            print("fonction will return a None object")
        return None
        

    # get the corresponding vocabulary of this label for the two files : 
    vocab_df = pd.concat([df_patient_1[df_patient_1['label']== label_1], 
                       df_patient_2[df_patient_2['label']== label_2]])
    
    vocab_size = len(vocab_df)
    
    if verbose :
        print(f'For labels "{label_1, label_2}", the vocabulary size is', vocab_size)
        
        
    # convert it to a dict readable for the CountVectorizer function 
    vocab_dict = {}
    j = 0
    for i in vocab_df['idx']:
        if vocab_df['term'][i] not in vocab_dict.keys():
            vocab_dict[vocab_df['term'][i]] = j
            j += 1
        
    # get a representation feature 
    vect = CountVectorizer(vocabulary = vocab_dict, tokenizer = lambda x : [x], lowercase = False)# .fit([d1,d2,d3])
    # print("\n Features:\n","\n".join(vect.get_feature_names()))
        
    # get the terms for file_1 label_1
    d1 = vocab_df[(vocab_df['source']== file_1) & (vocab_df['label']== label_1)]
    term_1 = d1['term'].to_list()
    if verbose:
        print(f'\n terms patient 1 for label {label_1}\n', term_1)
    
    d2 = vocab_df[(vocab_df['source']== file_2) & (vocab_df['label']== label_2)]
    term_2 = d2['term'].to_list()
    if verbose:
        print(f'\n terms patient 2 for label {label_2}\n', term_2)
    
    # get the corresponding histograms 
    v1_1 = vect.transform(term_1).toarray()
    v_1 = np.sum(v1_1, 0)
    v2_1 = vect.transform(term_2).toarray()
    v_2 = np.sum(v2_1, 0)
    
    # print(v_1, v_2)
    # print("\n cosine(doc_1, doc_2) = {:.2f}".format(cosine(v_1, v_2)))
    
    # get the FastText of BERT_embedding associated  
    idx_w = [vocab_df[vocab_df['term'] == w].iloc[0].idx for w in vect.get_feature_names()]
    W_2 = []

    for idx in idx_w:
        # print('\n------idx', idx)
        if (Embedding == 'Fasttext'): 
            W_2.append(vocab_df['fastext_embeddings'][int(idx)])

        elif Embedding == "local_BERT": 
            W_2.append(vocab_df['BERT_embeddings'][int(idx)])
        
        elif Embedding == "EDS_BERT": 
            W_2.append(vocab_df['EDS_BERT_embeddings'][int(idx)])
                
    if Distance_type == 'cosine':
        Dist = sklearn.metrics.pairwise.cosine_distances(W_2) # cosine_distance : ie 1-cos similarity = 1-cos(theta)
    if Distance_type == 'euclid':
        Dist = euclidean_distances(W_2)
    
    # distance computation : 
    # pyemd needs double precision input
    v_1 = v_1.astype(np.double)
    v_2 = v_2.astype(np.double)
    
    v_1 /= v_1.sum()
    v_2 /= v_2.sum()
    
    Dist = Dist.astype(np.double)
    if Dist.max() != 0:
        Dist /= Dist.max()  # just for comparison purposes
    D_EMD = emd(v_1, v_2, Dist)
    
             
    if verbose:
        print(f'\nDistance {Distance_type} for labels {label_1, label_2} between {file_1} and {file_2} =',D_EMD)
    
    return D_EMD
