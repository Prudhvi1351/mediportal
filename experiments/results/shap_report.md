# SHAP Explainability Experimental Report

## A. Methodology & Configuration
- **Model:** Random Forest Classifier (n_estimators=100, random_state=42)
- **Dataset:** Breast Cancer Wisconsin (Diagnostic)
- **Cohort Size:** 114 held-out test instances (42 Malignant, 72 Benign)
- **Features:** 30 continuous morphological cell nuclei attributes
- **Explainer:** TreeExplainer (TreeSHAP)
- **Target Target Explaining:** Class 1 (Malignant)

## B. Top 10 Predictive Features
|   Rank | Feature              |   Mean_Absolute_SHAP |   Percentage_of_Total_SHAP_Importance |
|-------:|:---------------------|---------------------:|--------------------------------------:|
|      1 | worst area           |            0.0674193 |                              13.6303  |
|      2 | worst concave points |            0.064037  |                              12.9465  |
|      3 | worst radius         |            0.0446073 |                               9.01836 |
|      4 | mean concave points  |            0.0411582 |                               8.32104 |
|      5 | worst perimeter      |            0.0406862 |                               8.22562 |
|      6 | mean perimeter       |            0.0276708 |                               5.59427 |
|      7 | mean concavity       |            0.0260265 |                               5.26183 |
|      8 | mean radius          |            0.0252551 |                               5.10589 |
|      9 | area error           |            0.0226386 |                               4.5769  |
|     10 | mean area            |            0.0225547 |                               4.55994 |

## C. Individual Case Study
- **Selection Rule:** First correctly classified malignant instance in held-out test partition
- **Test Set Index:** #1
- **True Diagnosis:** Malignant (1)
- **Predicted Diagnosis:** Malignant (1)
- **Predicted Malignant Probability:** 1.0000
- **Base Value (Expected Output):** 0.3726
- **Top Positive Contributors (Increasing Malignancy Risk):**
|                      |         0 |
|:---------------------|----------:|
| worst area           | 0.112081  |
| worst concave points | 0.0841754 |
| worst radius         | 0.0644775 |
- **Top Negative Contributors (Protective Factors):**
|                   |           0 |
|:------------------|------------:|
| worst smoothness  | -0.00581829 |
| concavity error   | -0.00432641 |
| compactness error | -0.00135644 |

## D. Verification Checklist & Sanity Checks
- [x] Test partition exactly matches 114 samples
- [x] All 30 features verified without index displacement
- [x] Malignant positive class correctly isolated (Class index 1)
- [x] All SHAP values verified finite (No NaNs/Infs)
- [x] Figures exported at 300 DPI (PNG & PDF)
- [x] Strictly observational model explanation: No causal medical claims made
