# ML-Based Pharmacy Inventory Optimization and Redistribution System

## Project Overview

This project is an ML-driven pharmacy inventory management system designed to reduce medicine wastage, prevent stock shortages, and improve inventory decision-making.

The system combines demand forecasting, expiry-risk detection, inventory optimization, and pharmacy-to-pharmacy redistribution recommendations.

Unlike traditional pharmacy software that only tracks stock, this system provides intelligent recommendations based on machine learning models and inventory analytics.

---

## Team Members

* Sindhuja Narayan
* Goli Sri Varshitha
* Divyasree Vanaparla

Guide:

* Dr. G. Malini Devi

---

## Problem Statement

Pharmacies often face:

* Overstocking of medicines
* Stock shortages
* Medicine expiry losses
* Poor inventory planning

Most existing systems only record inventory and billing data without providing predictive insights or optimization recommendations.

---

## Objectives

* Predict medicine demand using machine learning
* Detect expiry-risk medicines
* Recommend optimal reorder quantities
* Identify surplus inventory
* Enable pharmacy-to-pharmacy redistribution
* Improve inventory health and decision-making

---

## Features

### Demand Forecasting

Predicts future medicine demand using:

* Random Forest Regressor
* Linear Regression

### Expiry Risk Detection

Classifies medicines into risk categories using:

* Logistic Regression

### Inventory Optimization

Calculates:

* Reorder Point (ROP)
* Safety Stock
* Surplus Inventory

### Redistribution Matching

Matches:

* Pharmacies with surplus stock
* Pharmacies with shortages

and recommends redistribution opportunities.

### Dashboard Analytics

Provides:

* Inventory Health Score
* Low Stock Alerts
* Expiry Alerts
* Reorder Recommendations
* Redistribution Suggestions

---

## Multi-Pharmacy Simulation

The project simulates multiple pharmacies:

### Rama Pharmacy

* Balanced inventory
* Healthy stock levels

### Lakshmi Medicals

* Stock shortage scenario
* Reorder-focused recommendations

### Sai Pharmacy

* Expiry-risk scenario
* Monitoring and risk alerts

---

## Technology Stack

### Frontend

* React.js

### Backend

* FastAPI
* Python

### Machine Learning

* Scikit-learn
* Pandas
* NumPy

### Database

* PostgreSQL

### Version Control

* Git
* GitHub

---

## Core Algorithms

### Reorder Point

ROP = Demand × Lead Time + Safety Stock

### Safety Stock

Safety Stock = 20% of Average Demand

### Surplus Calculation

Surplus = Stock − Demand − Safety Stock

### Inventory Health Score

Calculated using:

* Low Stock Percentage
* Expiry Risk Percentage
* Surplus Percentage

---

## Project Architecture

Frontend (React)
↓
Backend API (FastAPI)
↓
PostgreSQL Database
↓
Machine Learning Models
↓
Decision Engine
↓
Redistribution Matching System

---

## Installation

### Clone Repository

git clone https://github.com/sinitehacker/pharmacy-inventory-system.git

### Backend Setup

pip install -r requirements.txt

uvicorn main:app --reload

### Frontend Setup

npm install

npm start

---

## Expected Outcomes

* Reduced medicine wastage
* Improved stock availability
* Better inventory planning
* Explainable ML-based recommendations
* Practical support for small and medium pharmacies

---

## Future Scope

* Integration with real pharmacy billing systems
* Mobile application support
* Real-time supplier integration
* Advanced forecasting models
* Automated notifications and alerts

---

## Repository

https://github.com/sinitehacker/pharmacy-inventory-system
